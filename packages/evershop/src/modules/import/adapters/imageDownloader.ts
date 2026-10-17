import { fetch as undiciFetch } from 'undici';
import type { Response } from 'undici';
import { createGuardedAgent } from '../../../lib/ssrf/guardedAgent.js';
import {
  assertLiteralAllowed,
  BlockedAddressError
} from '../../../lib/ssrf/guardedLookup.js';
import type { LookupFunction } from '../../../lib/ssrf/guardedLookup.js';
import {
  checkImageType,
  normalizeContentType
} from '../services/images/imageTypes.js';
import { parseImageUrl } from '../services/images/imageUrl.js';
import { ImageError } from '../services/images/types.js';

/** Redirects followed for one image (§ 10). */
export const MAX_REDIRECTS = 3;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export interface ImageDownloaderOptions {
  /** `system.import.allowPrivateNetworks`: a test switch (§ 4.5, point 9). */
  allowPrivate: () => boolean;
  /** The DNS lookup. A test passes a fake. */
  lookup?: LookupFunction;
  /** The deadline for one image, redirects included (`imageTimeoutSeconds`). */
  timeoutMs: number;
  /** The types the store accepts for uploads (`getAllowedMimeTypes`). */
  allowedTypes: () => readonly string[];
  /** The size limit for a type, in bytes (`getMaxUploadFileSizeMbForType`). */
  maxBytesForType: (contentType: string) => number;
}

export interface DownloadedImage {
  bytes: Buffer;
  contentType: string;
  /** The address after the redirects. */
  finalUrl: string;
}

export interface ImageDownloader {
  /** Reads the image. Throws `ImageError`. */
  download(url: string): Promise<DownloadedImage>;
  /**
   * Checks that the image can be reached, without reading its body: `HEAD`, and
   * when the server refuses it (405, 501) a `GET` of the first byte.
   */
  probe(url: string): Promise<void>;
  close(): Promise<void>;
}

const HEADERS = {
  // The size limit is checked on the bytes that arrive, and a compressed
  // response would hide how many there are. A server that compresses anyway is
  // still held to the limit: the bytes are counted after they are unpacked.
  'accept-encoding': 'identity',
  accept: 'image/*',
  'user-agent': 'EverShop-Import'
};

async function discard(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // The connection is released either way.
  }
}

function toImageError(error: unknown, signal: AbortSignal): ImageError {
  if (error instanceof ImageError) {
    return error;
  }
  const e = error as any;
  const cause = e?.cause;
  if (error instanceof BlockedAddressError || cause?.code === 'EBLOCKED') {
    return new ImageError('blocked');
  }
  if (
    signal.aborted ||
    e?.name === 'AbortError' ||
    cause?.name === 'AbortError'
  ) {
    return new ImageError('timeout');
  }
  const code = cause?.code ?? e?.code;
  return new ImageError('network', {
    code: typeof code === 'string' ? code : 'ERROR'
  });
}

export function createImageDownloader(
  options: ImageDownloaderOptions
): ImageDownloader {
  const agent = createGuardedAgent({
    allowPrivate: options.allowPrivate,
    lookup: options.lookup
  });

  // Sends the request and follows up to MAX_REDIRECTS redirects. Every address
  // is checked again: an IP literal here, a name by the guarded lookup of the
  // agent at connect time.
  async function request(
    startUrl: string,
    method: 'GET' | 'HEAD',
    headers: Record<string, string>,
    signal: AbortSignal
  ): Promise<{ response: Response; url: URL }> {
    let current = parseImageUrl(startUrl);
    for (let hop = 0; ; hop += 1) {
      try {
        assertLiteralAllowed(current.hostname, options.allowPrivate());
      } catch {
        throw new ImageError('blocked');
      }
      let response: Response;
      try {
        response = await undiciFetch(current, {
          method,
          headers,
          redirect: 'manual',
          signal,
          dispatcher: agent
        });
      } catch (e) {
        throw toImageError(e, signal);
      }
      if (!REDIRECT_STATUSES.has(response.status)) {
        return { response, url: current };
      }
      const location = response.headers.get('location');
      await discard(response);
      if (!location) {
        throw new ImageError('http_status', { status: response.status });
      }
      if (hop >= MAX_REDIRECTS) {
        throw new ImageError('too_many_redirects', { max: MAX_REDIRECTS });
      }
      let next: string;
      try {
        next = new URL(location, current).href;
      } catch {
        throw new ImageError('invalid_url');
      }
      current = parseImageUrl(next);
    }
  }

  async function withDeadline<T>(
    work: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      return await work(controller.signal);
    } catch (e) {
      throw toImageError(e, controller.signal);
    } finally {
      clearTimeout(timer);
    }
  }

  // Status 2xx and an accepted type of image; returns the type.
  async function checkAnswer(response: Response): Promise<string> {
    if (response.status < 200 || response.status > 299) {
      await discard(response);
      throw new ImageError('http_status', { status: response.status });
    }
    const contentType = normalizeContentType(
      response.headers.get('content-type')
    );
    const problem = checkImageType(contentType, options.allowedTypes());
    if (problem) {
      await discard(response);
      throw problem;
    }
    return contentType as string;
  }

  const tooLarge = (contentType: string, maxBytes: number) =>
    new ImageError('too_large', { contentType, maxMb: maxBytes / 1_048_576 });

  async function readBody(
    response: Response,
    contentType: string,
    maxBytes: number
  ): Promise<Buffer> {
    const reader = response.body?.getReader();
    if (!reader) {
      return Buffer.alloc(0);
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw tooLarge(contentType, maxBytes);
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks, total);
  }

  return {
    download(url) {
      return withDeadline(async (signal) => {
        const { response, url: finalUrl } = await request(
          url,
          'GET',
          HEADERS,
          signal
        );
        const contentType = await checkAnswer(response);
        const maxBytes = options.maxBytesForType(contentType);
        const declared = Number(response.headers.get('content-length'));
        if (Number.isFinite(declared) && declared > maxBytes) {
          await discard(response);
          throw tooLarge(contentType, maxBytes);
        }
        const bytes = await readBody(response, contentType, maxBytes);
        if (bytes.length === 0) {
          throw new ImageError('empty');
        }
        return { bytes, contentType, finalUrl: finalUrl.href };
      });
    },

    probe(url) {
      return withDeadline(async (signal) => {
        let { response } = await request(url, 'HEAD', HEADERS, signal);
        if (response.status === 405 || response.status === 501) {
          await discard(response);
          ({ response } = await request(
            url,
            'GET',
            { ...HEADERS, range: 'bytes=0-0' },
            signal
          ));
        }
        await checkAnswer(response);
        await discard(response);
      });
    },

    close() {
      return agent.close();
    }
  };
}

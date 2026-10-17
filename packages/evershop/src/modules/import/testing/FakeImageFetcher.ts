import { imageStorageKey } from '../services/images/imageKey.js';
import type { ImageKeyDeps } from '../services/images/imageKey.js';
import { extensionForImageType } from '../services/images/imageTypes.js';
import { parseImageUrl } from '../services/images/imageUrl.js';
import { ImageError } from '../services/images/types.js';
import type { ImageFetcher, StoredImage } from '../services/images/types.js';

type Entry =
  | { kind: 'image'; contentType: string }
  | { kind: 'error'; error: ImageError };

/**
 * TEST-ONLY. An `ImageFetcher` that answers from a table: URL → an image, or a
 * failure, optionally after a delay. It stores nothing; the URL it returns is
 * built from the same key as the real one (`/assets/catalog/<aa>/<bb>/<name>`),
 * so the same URL always gives the same answer.
 */
export class FakeImageFetcher implements ImageFetcher {
  /** Every URL asked for with `fetchAndStore`, in order. */
  readonly fetched: string[] = [];

  /** Every URL asked for with `probe`, in order. */
  readonly probed: string[] = [];

  private readonly entries = new Map<string, Entry>();

  private readonly delays = new Map<string, number>();

  constructor(
    private readonly keyDeps: ImageKeyDeps,
    // The Clock port's `sleep`; the default returns at once.
    private readonly sleep: (ms: number) => Promise<void> = () =>
      Promise.resolve(),
    private readonly ownStorage: readonly string[] = []
  ) {}

  /** `url` is an image of `contentType`. */
  hasImage(url: string, contentType = 'image/png'): this {
    this.entries.set(url, { kind: 'image', contentType });
    return this;
  }

  /** `url` fails with `error` (a missing URL fails with `network`). */
  fails(url: string, error: ImageError): this {
    this.entries.set(url, { kind: 'error', error });
    return this;
  }

  /** The answer for `url` comes after `ms` on the `sleep` it was given. */
  delayAnswer(url: string, ms: number): this {
    this.delays.set(url, ms);
    return this;
  }

  private async answer(url: string): Promise<Entry & { kind: 'image' }> {
    const wait = this.delays.get(url);
    if (wait !== undefined) {
      await this.sleep(wait);
    }
    const entry = this.entries.get(url) ?? {
      kind: 'error' as const,
      error: new ImageError('network', { code: 'ENOTFOUND' })
    };
    if (entry.kind === 'error') {
      throw entry.error;
    }
    return entry;
  }

  async fetchAndStore(url: string): Promise<StoredImage> {
    this.fetched.push(url);
    parseImageUrl(url);
    if (this.ownStorage.some((prefix) => url.startsWith(prefix))) {
      return { url, copied: false };
    }
    const { contentType } = await this.answer(url);
    if (extensionForImageType(contentType) === null) {
      throw new ImageError('type_not_allowed', { contentType });
    }
    const key = imageStorageKey(url, contentType, this.keyDeps);
    return { url: `/assets/${key.directory}/${key.fileName}`, copied: true };
  }

  async probe(url: string): Promise<void> {
    this.probed.push(url);
    parseImageUrl(url);
    if (!this.ownStorage.some((prefix) => url.startsWith(prefix))) {
      await this.answer(url);
    }
  }
}

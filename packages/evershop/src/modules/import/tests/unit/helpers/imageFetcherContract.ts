import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach
} from '@jest/globals';
import { ImageError } from '../../../services/images/types.js';
import type { ImageFetcher } from '../../../services/images/types.js';

/**
 * What every `ImageFetcher` must do (§ 4.5, point 6). It runs against the fake
 * in the unit tests and against the real one on a local server, so a fake that
 * behaves differently from the real thing cannot pass.
 */
export interface ContractContext {
  fetcher: ImageFetcher;
  urls: {
    /** An image (a PNG). */
    ok: string;
    /** The server answers 404. */
    notFound: string;
    /** The server answers 200 with a page, not an image. */
    notImage: string;
    /** An image over the size limit for its type. */
    tooLarge: string;
    /** A private address. */
    blocked: string;
    /** Nothing listens there. */
    unreachable: string;
  };
  /** The real fetcher is told whether private addresses are allowed. */
  setPrivateAllowed(allowed: boolean): void;
}

const REASONS = [
  'invalid_url',
  'blocked',
  'timeout',
  'network',
  'http_status',
  'too_many_redirects',
  'not_an_image',
  'type_not_allowed',
  'too_large',
  'empty',
  'storage_failed'
];

async function failure(work: Promise<unknown>): Promise<ImageError> {
  try {
    await work;
  } catch (e) {
    expect(e).toBeInstanceOf(ImageError);
    expect(REASONS).toContain((e as ImageError).reason);
    return e as ImageError;
  }
  throw new Error('Expected the image to fail');
}

export function imageFetcherContract(
  name: string,
  setup: () => Promise<{
    context: ContractContext;
    cleanup: () => Promise<void>;
  }>
): void {
  describe(`ImageFetcher contract: ${name}`, () => {
    let context: ContractContext;
    let cleanup: () => Promise<void>;

    beforeAll(async () => {
      ({ context, cleanup } = await setup());
    });

    afterAll(async () => {
      await cleanup();
    });

    beforeEach(() => {
      context.setPrivateAllowed(true);
    });

    it('stores an image and says where; the same URL gives the same answer', async () => {
      const first = await context.fetcher.fetchAndStore(context.urls.ok);
      expect(first.copied).toBe(true);
      expect(first.url).toMatch(
        /^\/assets\/catalog\/[0-9a-f]{2}\/[0-9a-f]{2}\/[a-z0-9-]+\.png$/
      );
      expect(await context.fetcher.fetchAndStore(context.urls.ok)).toEqual(
        first
      );
    });

    it('probes an image without storing it', async () => {
      await expect(
        context.fetcher.probe(context.urls.ok)
      ).resolves.toBeUndefined();
    });

    it('fails with http_status and the status when the server says 404', async () => {
      const error = await failure(
        context.fetcher.fetchAndStore(context.urls.notFound)
      );
      expect(error.reason).toBe('http_status');
      expect(error.params.status).toBe(404);
      expect(
        (await failure(context.fetcher.probe(context.urls.notFound))).reason
      ).toBe('http_status');
    });

    it('fails with not_an_image when the answer is a page', async () => {
      expect(
        (await failure(context.fetcher.fetchAndStore(context.urls.notImage)))
          .reason
      ).toBe('not_an_image');
    });

    it('fails with too_large when the image is over the limit', async () => {
      expect(
        (await failure(context.fetcher.fetchAndStore(context.urls.tooLarge)))
          .reason
      ).toBe('too_large');
    });

    it('fails with blocked for a private address', async () => {
      context.setPrivateAllowed(false);
      expect(
        (await failure(context.fetcher.fetchAndStore(context.urls.blocked)))
          .reason
      ).toBe('blocked');
      expect(
        (await failure(context.fetcher.probe(context.urls.blocked))).reason
      ).toBe('blocked');
    });

    it('fails with network when nothing answers', async () => {
      expect(
        (await failure(context.fetcher.fetchAndStore(context.urls.unreachable)))
          .reason
      ).toBe('network');
    });

    it.each([
      ['ftp://example.com/a.png'],
      ['not a url'],
      ['https://user:pw@example.com/a.png'],
      ['']
    ])('fails with invalid_url for %j', async (url) => {
      expect((await failure(context.fetcher.fetchAndStore(url))).reason).toBe(
        'invalid_url'
      );
    });
  });
}

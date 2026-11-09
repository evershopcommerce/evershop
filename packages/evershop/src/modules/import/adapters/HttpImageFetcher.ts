import { imageStorageKey } from '../services/images/imageKey.js';
import type { ImageKeyDeps } from '../services/images/imageKey.js';
import { isOwnStorageUrl } from '../services/images/ownStorage.js';
import { ImageError } from '../services/images/types.js';
import type { ImageFetcher } from '../services/images/types.js';
import { createImageDownloader } from './imageDownloader.js';
import type { ImageDownloaderOptions } from './imageDownloader.js';

export interface StoredFile {
  /** `catalog/<aa>/<bb>`. */
  directory: string;
  fileName: string;
  buffer: Buffer;
  contentType: string;
}

export interface HttpImageFetcherOptions extends ImageDownloaderOptions {
  keyDeps: ImageKeyDeps;
  /** Writes the file to the store's file storage (`uploadFile`). */
  store: (file: StoredFile) => Promise<{ url: string }>;
  /** The addresses of this store's own file storage (IMG-06). */
  ownStorage?: () => readonly string[];
}

/**
 * The real `ImageFetcher`: downloads through the SSRF guard and stores the file.
 * A URL that points into the store's own storage is kept as it is.
 */
export function createHttpImageFetcher(
  options: HttpImageFetcherOptions
): ImageFetcher & { close(): Promise<void> } {
  const downloader = createImageDownloader(options);
  const isOwn = (url: string) =>
    isOwnStorageUrl(url, options.ownStorage?.() ?? []);
  return {
    async fetchAndStore(url) {
      if (isOwn(url)) {
        return { url, copied: false };
      }
      const image = await downloader.download(url);
      // The folder and the name come from the URL as it was written, not from
      // where the redirects ended, so that the same cell gives the same file.
      const key = imageStorageKey(url, image.contentType, options.keyDeps);
      try {
        const stored = await options.store({
          directory: key.directory,
          fileName: key.fileName,
          buffer: image.bytes,
          contentType: image.contentType
        });
        return { url: stored.url, copied: true };
      } catch (e) {
        throw new ImageError('storage_failed', {
          message: String((e as Error)?.message ?? e).slice(0, 200)
        });
      }
    },

    async probe(url) {
      if (!isOwn(url)) {
        await downloader.probe(url);
      }
    },

    close: () => downloader.close()
  };
}

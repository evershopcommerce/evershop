import type { ImageFetcher, StoredImage } from './types.js';

/**
 * One fetch per URL per run (§ 5.8): variants usually share their main image.
 * Two rows that ask for the same URL at the same time share the one fetch. A
 * success is remembered; a failure is not, so the retry of a row (IMP-06) asks
 * again.
 */
export function cachedImageFetcher(inner: ImageFetcher): ImageFetcher {
  const stored = new Map<string, Promise<StoredImage>>();
  const probed = new Map<string, Promise<void>>();
  return {
    fetchAndStore(url) {
      let pending = stored.get(url);
      if (!pending) {
        pending = inner.fetchAndStore(url);
        stored.set(url, pending);
        pending.catch(() => stored.delete(url));
      }
      return pending;
    },
    probe(url) {
      let pending = probed.get(url);
      if (!pending) {
        pending = inner.probe(url);
        probed.set(url, pending);
        pending.catch(() => probed.delete(url));
      }
      return pending;
    }
  };
}

import type { ImageFetcher, StoredImage } from './types.js';

/** One fetch that was asked for ahead of its row. */
interface Entry {
  url: string;
  promise: Promise<StoredImage>;
  resolve: (image: StoredImage) => void;
  reject: (error: unknown) => void;
  /** The writer is waiting for it, so it is started whatever else happens. */
  wanted: boolean;
  started: boolean;
  /** It is in the line of fetches to be started. */
  inLine: boolean;
}

/**
 * Fetches the images of the rows ahead of the row the writer is on, a few at a
 * time (`imageConcurrency`, § 8.5): images use the network and not the database,
 * and they dominate the duration of an import that has them. The writer still
 * takes the image of a row when it reaches the row, so a failure is the failure
 * of that row (IMP-03) and the order of what is written does not change.
 *
 * - `schedule(urls)` queues one fetch for each URL, in the order given. A URL
 *   that appears twice is fetched twice, once for each row, as without it.
 * - `fetch(url)` gives the next fetch queued for that URL, started or not (it is
 *   started as soon as there is room). A URL with nothing queued, which is the
 *   retry of a failed fetch, is fetched again, ahead of the queue.
 * - `clear()` forgets what was queued and not yet started or wanted: the rest of
 *   a batch whose rows were skipped. A fetch already running ends on its own.
 * - Once the run is aborted, no fetch is started that nobody is waiting for.
 */
export class ImagePrefetcher {
  private readonly queued = new Map<string, Entry[]>();

  private readonly waiting: Entry[] = [];

  private active = 0;

  constructor(
    private readonly fetcher: ImageFetcher,
    private readonly concurrency: number,
    private readonly signal?: AbortSignal
  ) {}

  schedule(urls: Iterable<string>): void {
    for (const url of urls) {
      const entry = this.entry(url);
      const list = this.queued.get(url) ?? [];
      list.push(entry);
      this.queued.set(url, list);
      entry.inLine = true;
      this.waiting.push(entry);
    }
    this.pump();
  }

  fetch(url: string): Promise<StoredImage> {
    const list = this.queued.get(url);
    const next = list?.shift();
    if (list && list.length === 0) {
      this.queued.delete(url);
    }
    if (next) {
      next.wanted = true;
      if (!next.started && !next.inLine) {
        // Dropped after an abort, and now somebody is waiting for it after all.
        next.inLine = true;
        this.waiting.unshift(next);
      }
      this.pump();
      return next.promise;
    }
    // A retry, or a URL nobody scheduled: it goes ahead of the queue.
    const entry = this.entry(url);
    entry.wanted = true;
    entry.inLine = true;
    this.waiting.unshift(entry);
    this.pump();
    return entry.promise;
  }

  clear(): void {
    this.queued.clear();
    for (let at = this.waiting.length - 1; at >= 0; at -= 1) {
      if (!this.waiting[at].wanted) {
        this.waiting[at].inLine = false;
        this.waiting.splice(at, 1);
      }
    }
  }

  private entry(url: string): Entry {
    let resolve!: Entry['resolve'];
    let reject!: Entry['reject'];
    const promise = new Promise<StoredImage>((ok, fail) => {
      resolve = ok;
      reject = fail;
    });
    // A fetch nobody asks for must not be an unhandled rejection.
    promise.catch(() => undefined);
    return {
      url,
      promise,
      resolve,
      reject,
      wanted: false,
      started: false,
      inLine: false
    };
  }

  private pump(): void {
    while (this.active < this.concurrency && this.waiting.length > 0) {
      const at = this.signal?.aborted
        ? this.waiting.findIndex((entry) => entry.wanted)
        : 0;
      if (at === -1) {
        // Aborted: what nobody waits for is not started. A row that is still on
        // its way asks for its images with `fetch`, which puts them back.
        for (const entry of this.waiting) {
          entry.inLine = false;
        }
        this.waiting.length = 0;
        return;
      }
      const [entry] = this.waiting.splice(at, 1);
      entry.inLine = false;
      entry.started = true;
      this.active += 1;
      this.fetcher.fetchAndStore(entry.url).then(
        (image) => {
          this.active -= 1;
          entry.resolve(image);
          this.pump();
        },
        (error) => {
          this.active -= 1;
          entry.reject(error);
          this.pump();
        }
      );
    }
  }
}

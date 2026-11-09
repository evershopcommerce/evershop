import { describe, expect, it } from '@jest/globals';
import { ImagePrefetcher } from '../../../services/images/prefetch.js';
import { ImageError } from '../../../services/images/types.js';
import type {
  ImageFetcher,
  StoredImage
} from '../../../services/images/types.js';

/**
 * The prefetcher: images fetched ahead of their rows, a few at a time, taken by
 * the row that holds them. The fetcher here is told when each fetch ends.
 */
class ControlledFetcher implements ImageFetcher {
  /** URLs in the order their fetch began. */
  readonly started: string[] = [];

  active = 0;

  peak = 0;

  private readonly open = new Map<
    string,
    Array<{ ok: (image: StoredImage) => void; fail: (error: unknown) => void }>
  >();

  fetchAndStore(url: string): Promise<StoredImage> {
    this.started.push(url);
    this.active += 1;
    this.peak = Math.max(this.peak, this.active);
    return new Promise<StoredImage>((ok, fail) => {
      const list = this.open.get(url) ?? [];
      list.push({
        ok: (image) => {
          this.active -= 1;
          ok(image);
        },
        fail: (error) => {
          this.active -= 1;
          fail(error);
        }
      });
      this.open.set(url, list);
    });
  }

  async probe(): Promise<void> {
    return undefined;
  }

  /** The fetch of `url` that began first and has not ended ends well. */
  end(url: string): void {
    this.open
      .get(url)
      ?.shift()
      ?.ok({ url: `/assets/${url}`, copied: true });
  }

  /** ... or badly. */
  failIt(url: string, error: unknown = new ImageError('timeout')): void {
    this.open.get(url)?.shift()?.fail(error);
  }
}

const tick = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

describe('ImagePrefetcher', () => {
  it('starts at most `concurrency` fetches at once, in the order they were scheduled, and starts the next as one ends', async () => {
    const fetcher = new ControlledFetcher();
    const prefetcher = new ImagePrefetcher(fetcher, 2);
    prefetcher.schedule(['a', 'b', 'c', 'd']);
    expect(fetcher.started).toEqual(['a', 'b']);
    fetcher.end('a');
    await tick();
    expect(fetcher.started).toEqual(['a', 'b', 'c']);
    fetcher.end('c');
    fetcher.end('b');
    await tick();
    expect(fetcher.started).toEqual(['a', 'b', 'c', 'd']);
    expect(fetcher.peak).toBe(2);
    fetcher.end('d');
  });

  it('gives each row the image it asked for, in the order the rows come, whatever the order the fetches end in', async () => {
    const fetcher = new ControlledFetcher();
    const prefetcher = new ImagePrefetcher(fetcher, 3);
    prefetcher.schedule(['a', 'b', 'c']);
    const first = prefetcher.fetch('a');
    const second = prefetcher.fetch('b');
    fetcher.end('b');
    fetcher.end('c');
    expect(await second).toEqual({ url: '/assets/b', copied: true });
    fetcher.end('a');
    expect(await first).toEqual({ url: '/assets/a', copied: true });
    expect(await prefetcher.fetch('c')).toEqual({
      url: '/assets/c',
      copied: true
    });
  });

  it('waits for a fetch that has not been started when a row asks for it, and starts it when there is room', async () => {
    const fetcher = new ControlledFetcher();
    const prefetcher = new ImagePrefetcher(fetcher, 1);
    prefetcher.schedule(['a', 'b']);
    const second = prefetcher.fetch('b');
    expect(fetcher.started).toEqual(['a']);
    fetcher.end('a');
    await tick();
    expect(fetcher.started).toEqual(['a', 'b']);
    fetcher.end('b');
    expect(await second).toEqual({ url: '/assets/b', copied: true });
  });

  it('fetches a URL once for each time it is scheduled: a shared image is fetched for each row, as without the prefetch', async () => {
    const fetcher = new ControlledFetcher();
    const prefetcher = new ImagePrefetcher(fetcher, 4);
    prefetcher.schedule(['x', 'x', 'y']);
    expect(fetcher.started).toEqual(['x', 'x', 'y']);
    const one = prefetcher.fetch('x');
    const two = prefetcher.fetch('x');
    fetcher.end('x');
    fetcher.end('x');
    expect((await one).url).toBe('/assets/x');
    expect((await two).url).toBe('/assets/x');
  });

  it('fetches again, ahead of the queue, for a URL that nothing is queued for: the retry of a failure', async () => {
    const fetcher = new ControlledFetcher();
    const prefetcher = new ImagePrefetcher(fetcher, 1);
    prefetcher.schedule(['a', 'b', 'c']);
    const attempt = prefetcher.fetch('a');
    fetcher.failIt('a');
    await expect(attempt).rejects.toBeInstanceOf(ImageError);
    await tick();
    // 'b' was started when 'a' ended; the retry of 'a' goes in front of whatever
    // is left ('c'), and waits for its turn.
    expect(fetcher.started).toEqual(['a', 'b']);
    const retry = prefetcher.fetch('a');
    fetcher.end('b');
    await tick();
    expect(fetcher.started).toEqual(['a', 'b', 'a']);
    fetcher.end('a');
    expect((await retry).url).toBe('/assets/a');
    await tick();
    expect(fetcher.started).toEqual(['a', 'b', 'a', 'c']);
    fetcher.end('c');
  });

  it('is not an unhandled rejection when a fetch that nobody asks for fails', async () => {
    const fetcher = new ControlledFetcher();
    const prefetcher = new ImagePrefetcher(fetcher, 2);
    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', listener);
    try {
      prefetcher.schedule(['a', 'b']);
      fetcher.failIt('a', new Error('nobody asked'));
      fetcher.failIt('b', new ImageError('network'));
      await tick();
      await tick();
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', listener);
    }
  });

  it('forgets the fetches that were queued and not started or asked for, and leaves the rest', async () => {
    const fetcher = new ControlledFetcher();
    const prefetcher = new ImagePrefetcher(fetcher, 1);
    prefetcher.schedule(['a', 'b', 'c']);
    const wanted = prefetcher.fetch('b');
    prefetcher.clear();
    fetcher.end('a');
    await tick();
    // 'b' was asked for, so it is still fetched; 'c' was forgotten.
    expect(fetcher.started).toEqual(['a', 'b']);
    fetcher.end('b');
    expect((await wanted).url).toBe('/assets/b');
    await tick();
    expect(fetcher.started).toEqual(['a', 'b']);
    // A URL that was forgotten is fetched when somebody asks.
    const late = prefetcher.fetch('c');
    await tick();
    expect(fetcher.started).toEqual(['a', 'b', 'c']);
    fetcher.end('c');
    expect((await late).url).toBe('/assets/c');
  });

  it('after an abort starts only what somebody is waiting for', async () => {
    const fetcher = new ControlledFetcher();
    const controller = new AbortController();
    const prefetcher = new ImagePrefetcher(fetcher, 1, controller.signal);
    prefetcher.schedule(['a', 'b', 'c', 'd']);
    const waiting = prefetcher.fetch('c');
    controller.abort();
    fetcher.end('a');
    await tick();
    // 'b' and 'd' are not started; 'c' is, because the row that holds it is on its way.
    expect(fetcher.started).toEqual(['a', 'c']);
    fetcher.end('c');
    expect((await waiting).url).toBe('/assets/c');
    await tick();
    expect(fetcher.started).toEqual(['a', 'c']);
  });

  it('serves a row that asks for an image after the abort, even if the image had been dropped', async () => {
    const fetcher = new ControlledFetcher();
    const controller = new AbortController();
    const prefetcher = new ImagePrefetcher(fetcher, 1, controller.signal);
    prefetcher.schedule(['a', 'b']);
    controller.abort();
    fetcher.end('a');
    await tick();
    // 'b' was dropped by the abort; the row on its way still gets it.
    const late = prefetcher.fetch('b');
    await tick();
    expect(fetcher.started).toEqual(['a', 'b']);
    fetcher.end('b');
    expect((await late).url).toBe('/assets/b');
  });

  it('works with a limit of one, which is the order and the speed of no prefetch', async () => {
    const fetcher = new ControlledFetcher();
    const prefetcher = new ImagePrefetcher(fetcher, 1);
    prefetcher.schedule(['a', 'b']);
    expect(fetcher.started).toEqual(['a']);
    const results: string[] = [];
    const one = prefetcher.fetch('a').then((i) => results.push(i.url));
    const two = prefetcher.fetch('b').then((i) => results.push(i.url));
    fetcher.end('a');
    await tick();
    fetcher.end('b');
    await Promise.all([one, two]);
    expect(results).toEqual(['/assets/a', '/assets/b']);
    expect(fetcher.peak).toBe(1);
  });
});

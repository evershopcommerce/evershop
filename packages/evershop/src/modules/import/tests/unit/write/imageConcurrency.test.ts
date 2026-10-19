import { describe, expect, it } from '@jest/globals';
import { ImageError } from '../../../services/images/types.js';
import type { ImageFetcher } from '../../../services/images/types.js';
import {
  categoryFile,
  categoryRow
} from '../../../services/rules/categoryFiles.js';
import {
  PRODUCT_STORE,
  productFile,
  productRow
} from '../../../services/rules/productFiles.js';
import type { FakeImageFetcher } from '../../../testing/FakeImageFetcher.js';
import { importCategories, importProducts } from '../helpers/runImport.js';

/**
 * `imageConcurrency` (§ 8.5): the images of the rows of a batch are fetched a few
 * at a time while the rows before them are written. What is written, in what
 * order, and what becomes of a row whose image fails, must be what it is without
 * it.
 */
const tick = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

/** An image fetcher that takes a few turns of the event loop, and measures itself. */
class Latency implements ImageFetcher {
  active = 0;

  peak = 0;

  started: string[] = [];

  constructor(
    private readonly inner: FakeImageFetcher,
    private readonly turns = 3
  ) {}

  async fetchAndStore(url: string) {
    this.started.push(url);
    this.active += 1;
    this.peak = Math.max(this.peak, this.active);
    try {
      for (let at = 0; at < this.turns; at += 1) {
        // eslint-disable-next-line no-await-in-loop
        await tick();
      }
      return await this.inner.fetchAndStore(url);
    } finally {
      this.active -= 1;
    }
  }

  probe(url: string) {
    return this.inner.probe(url);
  }
}

const url = (n: number, k = 1) => `https://example.com/i${n}-${k}.jpg`;

const withImages = (urls: string[]) => (run: { images: FakeImageFetcher }) => {
  for (const u of urls) run.images.hasImage(u);
};

describe('writeCategories: images fetched ahead of their rows', () => {
  const rows = Array.from({ length: 12 }, (_, i) =>
    categoryRow({
      url_key: `c${String(i).padStart(2, '0')}`,
      name: `C${i}`,
      image: url(i)
    })
  );
  const file = categoryFile(...rows);
  const all = rows.map((_, i) => url(i));

  const run = (more: Record<string, unknown> = {}) => {
    const holder: { latency?: Latency } = {};
    return {
      holder,
      done: importCategories(file, {
        prepare: withImages(all),
        wrapImages: (inner) => {
          holder.latency = new Latency(inner);
          return holder.latency;
        },
        ...more
      })
    };
  };

  it('fetches up to the limit at once, and writes what the one-at-a-time run writes, in the same order', async () => {
    const one = run({ imageConcurrency: 1 });
    const four = run({ imageConcurrency: 4 });
    const [serial, parallel] = await Promise.all([one.done, four.done]);
    expect(one.holder.latency!.peak).toBe(1);
    expect(four.holder.latency!.peak).toBe(4);
    expect(parallel.services.calls.map((c) => [c.method, c.input])).toEqual(
      serial.services.calls.map((c) => [c.method, c.input])
    );
    expect(parallel.outcomes.map((o) => [o.key, o.result])).toEqual(
      serial.outcomes.map((o) => [o.key, o.result])
    );
    expect(parallel.outcomes.every((o) => o.result === 'created')).toBe(true);
    // Every row has its own image path, in the order of the file.
    expect(
      parallel.services.calls
        .map((c) => String(c.input.image))
        .every((p) => p.startsWith('/assets/'))
    ).toBe(true);
  });

  it('is one at a time when no limit is given', async () => {
    const plain = run();
    await plain.done;
    expect(plain.holder.latency!.peak).toBe(1);
  });

  it('fails the row whose image cannot be read and no other, writing nothing for it (IMP-03)', async () => {
    const bad = run({
      imageConcurrency: 4,
      prepare: (r: { images: FakeImageFetcher }) => {
        withImages(all)(r);
        r.images.fails(url(5), new ImageError('not_an_image'));
      }
    });
    const result = await bad.done;
    expect(
      result.outcomes.filter((o) => o.result === 'failed').map((o) => o.key)
    ).toEqual(['c05']);
    expect(result.outcomes[5].issues.map((i) => [i.code, i.column])).toEqual([
      ['IMAGE_UNREADABLE', 'image']
    ]);
    expect(result.services.calls.map((c) => c.input.url_key)).not.toContain(
      'c05'
    );
    expect(result.outcomes.filter((o) => o.result === 'created')).toHaveLength(
      11
    );
  });

  it('retries a fetch that failed for a moment, as it does without the prefetch', async () => {
    let first = true;
    const flaky = run({
      imageConcurrency: 4,
      wrapImages: (inner: FakeImageFetcher): ImageFetcher => ({
        async fetchAndStore(u) {
          if (u === url(3) && first) {
            first = false;
            throw new ImageError('timeout');
          }
          return inner.fetchAndStore(u);
        },
        probe: (u) => inner.probe(u)
      })
    });
    const result = await flaky.done;
    expect(result.outcomes[3]).toMatchObject({ result: 'created', retries: 1 });
    expect(result.clock.sleeps).toEqual([1000]);
  });

  it('does not fetch the image of a row that is not written (a resumed job)', async () => {
    const resumed = run({
      imageConcurrency: 4,
      include: ({ unit }: { unit: number }) => unit > 8
    });
    const result = await resumed.done;
    expect(resumed.holder.latency!.started.sort()).toEqual(all.slice(8).sort());
    expect(result.outcomes).toHaveLength(4);
  });

  it('fetches nothing for rows without an image', async () => {
    const result = await importCategories(
      categoryFile(
        categoryRow({ url_key: 'a', name: 'A', image: '' }),
        categoryRow({ url_key: 'b', name: 'B', image: '' })
      ),
      { imageConcurrency: 4 }
    );
    expect(result.images.fetched).toEqual([]);
  });

  it('stops fetching ahead when the run is stopped, and starts nothing that no row is waiting for', async () => {
    const controller = new AbortController();
    const stopped = run({
      imageConcurrency: 2,
      signal: controller.signal,
      prepare: (r: {
        images: FakeImageFetcher;
        services: {
          failOn: (
            m: (c: { input: Record<string, unknown> }) => boolean,
            e: Error
          ) => unknown;
        };
      }) => {
        withImages(all)(r);
        r.services.failOn((call) => {
          if (call.input.url_key === 'c02') controller.abort();
          return false;
        }, new Error('never'));
      }
    });
    const result = await stopped.done;
    expect(result.outcomes.map((o) => o.key)).toEqual(['c00', 'c01', 'c02']);
    await tick();
    await tick();
    await tick();
    await tick();
    // Three rows were written; a fetch ahead is at most the two that were running.
    expect(stopped.holder.latency!.started.length).toBeLessThanOrEqual(3 + 2);
    expect(stopped.holder.latency!.peak).toBeLessThanOrEqual(2);
  });
});

describe('writeProducts: images fetched ahead of their rows', () => {
  const sku = (n: number) => `P-${String(n).padStart(2, '0')}`;
  const images = (n: number) => [url(n, 1), url(n, 2), url(n, 3)];
  const rows = Array.from({ length: 8 }, (_, i) =>
    productRow({
      sku: sku(i),
      url_key: `p-${i}`,
      images: images(i).join('|')
    })
  );
  const file = productFile(...rows);
  const all = rows.flatMap((_, i) => images(i));

  const run = (more: Record<string, unknown> = {}) => {
    const holder: { latency?: Latency } = {};
    return {
      holder,
      done: importProducts(file, {
        store: PRODUCT_STORE,
        prepare: withImages(all),
        wrapImages: (inner) => {
          holder.latency = new Latency(inner);
          return holder.latency;
        },
        ...more
      })
    };
  };

  it('fetches up to the limit at once and keeps the images of a product in the order of its cell', async () => {
    const one = run({ imageConcurrency: 1 });
    const four = run({ imageConcurrency: 4 });
    const [serial, parallel] = await Promise.all([one.done, four.done]);
    expect(one.holder.latency!.peak).toBe(1);
    expect(four.holder.latency!.peak).toBe(4);
    expect(parallel.services.calls.map((c) => c.input)).toEqual(
      serial.services.calls.map((c) => c.input)
    );
    const first = parallel.services.calls[0].input.images as string[];
    expect(first).toHaveLength(3);
    expect(new Set(first).size).toBe(3);
    expect(parallel.outcomes.every((o) => o.result === 'created')).toBe(true);
  });

  it('fails the product whose second image cannot be read, and the others are written', async () => {
    const bad = run({
      imageConcurrency: 4,
      prepare: (r: { images: FakeImageFetcher }) => {
        withImages(all)(r);
        r.images.fails(url(4, 2), new ImageError('too_large'));
      }
    });
    const result = await bad.done;
    expect(
      result.outcomes.filter((o) => o.result === 'failed').map((o) => o.key)
    ).toEqual([sku(4)]);
    expect(
      result.outcomes[4].issues.map((i) => [i.code, i.column, i.value])
    ).toEqual([['IMAGE_UNREADABLE', 'images', url(4, 2)]]);
    expect(result.outcomes.filter((o) => o.result === 'created')).toHaveLength(
      7
    );
  });

  it('does not fetch the images of products that are not written, and fetches those that are in the order of the file', async () => {
    const resumed = run({
      imageConcurrency: 4,
      include: ({ unit }: { unit: number }) => unit > 2
    });
    await resumed.done;
    const { started } = resumed.holder.latency!;
    expect([...started].sort()).toEqual(
      rows
        .slice(2)
        .flatMap((_, i) => images(i + 2))
        .sort()
    );
    // The first units to be written are the first to be fetched, in order.
    expect(started.slice(0, 3)).toEqual(images(2));
  });
});

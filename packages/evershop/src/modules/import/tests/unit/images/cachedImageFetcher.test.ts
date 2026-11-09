import { describe, it, expect } from '@jest/globals';
import { cachedImageFetcher } from '../../../services/images/cachedImageFetcher.js';
import { ImageError } from '../../../services/images/types.js';
import type {
  ImageFetcher,
  StoredImage
} from '../../../services/images/types.js';

function counting(handler: (url: string) => Promise<StoredImage>) {
  const calls = { fetch: [] as string[], probe: [] as string[] };
  const inner: ImageFetcher = {
    fetchAndStore: (url) => {
      calls.fetch.push(url);
      return handler(url);
    },
    probe: async (url) => {
      calls.probe.push(url);
      if (url.includes('bad'))
        throw new ImageError('http_status', { status: 404 });
    }
  };
  return { inner, calls };
}

const stored = (url: string): StoredImage => ({
  url: `/assets/${url}`,
  copied: true
});

describe('cachedImageFetcher: one fetch per URL per run (§ 5.8)', () => {
  it('fetches a URL once and gives the same answer to every row', async () => {
    const { inner, calls } = counting(async (url) => stored(url));
    const cached = cachedImageFetcher(inner);
    const a = await cached.fetchAndStore('https://x.test/a.png');
    const b = await cached.fetchAndStore('https://x.test/a.png');
    await cached.fetchAndStore('https://x.test/b.png');
    expect(a).toEqual(b);
    expect(calls.fetch).toEqual([
      'https://x.test/a.png',
      'https://x.test/b.png'
    ]);
  });

  it('shares one fetch between rows that ask for the same URL at the same time', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { inner, calls } = counting(async (url) => {
      await gate;
      return stored(url);
    });
    const cached = cachedImageFetcher(inner);
    const pending = [
      cached.fetchAndStore('https://x.test/a.png'),
      cached.fetchAndStore('https://x.test/a.png'),
      cached.fetchAndStore('https://x.test/a.png')
    ];
    release();
    const results = await Promise.all(pending);
    expect(new Set(results.map((r) => r.url)).size).toBe(1);
    expect(calls.fetch).toHaveLength(1);
  });

  it('does not remember a failure: the retry of a row asks again', async () => {
    let attempt = 0;
    const { inner, calls } = counting(async (url) => {
      attempt += 1;
      if (attempt === 1) throw new ImageError('timeout');
      return stored(url);
    });
    const cached = cachedImageFetcher(inner);
    await expect(
      cached.fetchAndStore('https://x.test/a.png')
    ).rejects.toMatchObject({
      reason: 'timeout'
    });
    await expect(cached.fetchAndStore('https://x.test/a.png')).resolves.toEqual(
      stored('https://x.test/a.png')
    );
    await cached.fetchAndStore('https://x.test/a.png');
    expect(calls.fetch).toHaveLength(2);
  });

  it('gives the failure to every row that waited for the same fetch', async () => {
    const { inner } = counting(async () => {
      throw new ImageError('http_status', { status: 404 });
    });
    const cached = cachedImageFetcher(inner);
    const results = await Promise.allSettled([
      cached.fetchAndStore('https://x.test/a.png'),
      cached.fetchAndStore('https://x.test/a.png')
    ]);
    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
  });

  it('probes a URL once, and does not mix probes with fetches', async () => {
    const { inner, calls } = counting(async (url) => stored(url));
    const cached = cachedImageFetcher(inner);
    await cached.probe('https://x.test/a.png');
    await cached.probe('https://x.test/a.png');
    await cached.fetchAndStore('https://x.test/a.png');
    expect(calls.probe).toHaveLength(1);
    expect(calls.fetch).toHaveLength(1);
    await expect(cached.probe('https://x.test/bad.png')).rejects.toBeInstanceOf(
      ImageError
    );
    await expect(cached.probe('https://x.test/bad.png')).rejects.toBeInstanceOf(
      ImageError
    );
    expect(calls.probe).toHaveLength(3);
  });
});

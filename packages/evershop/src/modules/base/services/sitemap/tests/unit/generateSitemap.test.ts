import { getSitemapConfig } from '../../config.js';
import { generateSitemap } from '../../generateSitemap.js';
import { SitemapMeta, SitemapStorage } from '../../storage.js';
import { SitemapCollector, SitemapEntry } from '../../types.js';

/** An in-memory SitemapStorage for wiring/skip tests, with the written files exposed. */
function createMemoryStorage(): {
  storage: SitemapStorage;
  files: Map<string, string>;
} {
  const files = new Map<string, string>();
  const state: { meta: SitemapMeta | null } = { meta: null };
  const storage: SitemapStorage = {
    async writeFiles(toWrite) {
      for (const file of toWrite) files.set(file.name, file.content);
    },
    async readFile(name) {
      return files.has(name) ? Buffer.from(files.get(name) as string) : null;
    },
    async fileExists(name) {
      return files.has(name);
    },
    async readMeta() {
      return state.meta;
    },
    async writeMeta(meta) {
      state.meta = meta;
    },
    async pruneOrphans(keep) {
      for (const name of [...files.keys()]) {
        if (/^sitemap(-[a-z0-9-]+)?\.xml$/.test(name) && !keep.includes(name)) {
          files.delete(name);
        }
      }
    }
  };
  return { storage, files };
}

const collector = (
  name: string,
  entries: SitemapEntry[],
  hooks: { onCollect?: () => void; count?: number; maxUpdatedAt?: string | null } = {}
): SitemapCollector => ({
  name,
  async collect() {
    hooks.onCollect?.();
    return entries;
  },
  async getFingerprint() {
    return {
      count: hooks.count ?? entries.length,
      maxUpdatedAt: hooks.maxUpdatedAt ?? null
    };
  }
});

const BASE = {
  config: getSitemapConfig(),
  baseUrl: 'https://shop.com',
  locales: ['en', 'de'],
  defaultLocale: 'en',
  clock: () => 1_000_000
};

describe('generateSitemap — wiring', () => {
  it('produces an index + per-collector children with multi-locale hreflang', async () => {
    const { storage, files } = createMemoryStorage();
    const collectors = [
      collector('products', [
        {
          path: '/a',
          lastmod: '2026-01-01T00:00:00.000Z',
          changefreq: 'daily' as const,
          priority: 0.7
        }
      ]),
      collector('categories', [{ path: '/b' }]),
      collector('empty', []) // 0 URLs ⇒ no child, no index entry
    ];

    const result = await generateSitemap({
      ...BASE,
      force: true,
      collectors,
      storage
    });

    expect(result.generated).toBe(true);
    expect(result.files).toEqual([
      'sitemap.xml',
      'sitemap-products.xml',
      'sitemap-categories.xml'
    ]);
    expect(result.urlCount).toBe(4); // 2 entries × 2 locales
    expect(files.has('sitemap-empty.xml')).toBe(false);

    const index = files.get('sitemap.xml') as string;
    expect(index).toContain('<sitemapindex');
    expect(index).toContain('https://shop.com/sitemap-products.xml');
    expect(index).toContain('https://shop.com/sitemap-categories.xml');

    const products = files.get('sitemap-products.xml') as string;
    expect(products).toContain('xmlns:xhtml');
    expect(products).toContain('<loc>https://shop.com/a</loc>');
    expect(products).toContain('<loc>https://shop.com/de/a</loc>');
    expect(products).toContain('hreflang="x-default"');
  });
});

describe('generateSitemap — single-flight', () => {
  it('coalesces concurrent calls into one generation', async () => {
    let collectCount = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const slow: SitemapCollector = {
      name: 'slow',
      async collect() {
        collectCount += 1;
        await gate;
        return [{ path: '/a' }];
      },
      async getFingerprint() {
        return { count: 1, maxUpdatedAt: null };
      }
    };
    const { storage } = createMemoryStorage();
    const opts = { ...BASE, force: true, collectors: [slow], storage };

    const p1 = generateSitemap(opts);
    const p2 = generateSitemap(opts);
    release();
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(collectCount).toBe(1);
    expect(r1).toBe(r2); // same coalesced result
  });
});

describe('generateSitemap — fingerprint skip', () => {
  it('skips when unchanged and fresh, regenerates when stale', async () => {
    const { storage } = createMemoryStorage();
    let collectCount = 0;
    const collectors = [
      collector(
        'products',
        [{ path: '/a', lastmod: '2026-01-01T00:00:00.000Z' }],
        { onCollect: () => (collectCount += 1), count: 1, maxUpdatedAt: '2026-01-01T00:00:00.000Z' }
      )
    ];
    const T = 1_000_000;

    // First run generates.
    const r1 = await generateSitemap({ ...BASE, collectors, storage, force: true, clock: () => T });
    expect(r1.generated).toBe(true);
    expect(collectCount).toBe(1);

    // Same fingerprint, within max-age, files present ⇒ skip (no re-collect).
    const r2 = await generateSitemap({ ...BASE, collectors, storage, clock: () => T + 1000 });
    expect(r2.generated).toBe(false);
    expect(collectCount).toBe(1);

    // Past max-age ⇒ regenerate even though the fingerprint is unchanged.
    const r3 = await generateSitemap({
      ...BASE,
      collectors,
      storage,
      clock: () => T + 25 * 60 * 60 * 1000
    });
    expect(r3.generated).toBe(true);
    expect(collectCount).toBe(2);
  });
});

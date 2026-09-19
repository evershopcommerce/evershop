import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  SitemapMeta,
  createLocalSitemapStorage
} from '../../storage.js';

describe('createLocalSitemapStorage', () => {
  let publicDir: string;
  let cacheDir: string;
  let storage: ReturnType<typeof createLocalSitemapStorage>;

  beforeEach(async () => {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'sitemap-store-'));
    publicDir = path.join(root, 'public');
    cacheDir = path.join(root, 'cache');
    await fsp.mkdir(publicDir, { recursive: true });
    storage = createLocalSitemapStorage({ publicDir, cacheDir });
  });

  it('writes and reads files (round-trip)', async () => {
    await storage.writeFiles([
      { name: 'sitemap.xml', content: '<index/>' },
      { name: 'sitemap-products.xml', content: '<urlset/>' }
    ]);
    expect((await storage.readFile('sitemap.xml'))?.toString()).toBe('<index/>');
    expect((await storage.readFile('sitemap-products.xml'))?.toString()).toBe(
      '<urlset/>'
    );
    // Written to the flat public root (not a /sitemap/ subfolder).
    expect(await fsp.readdir(publicDir)).toEqual(
      expect.arrayContaining(['sitemap.xml', 'sitemap-products.xml'])
    );
  });

  it('reports existence and returns null for missing files', async () => {
    await storage.writeFiles([{ name: 'sitemap.xml', content: '<x/>' }]);
    expect(await storage.fileExists('sitemap.xml')).toBe(true);
    expect(await storage.fileExists('sitemap-nope.xml')).toBe(false);
    expect(await storage.readFile('sitemap-nope.xml')).toBeNull();
  });

  it('round-trips meta and returns null when absent', async () => {
    expect(await storage.readMeta()).toBeNull();
    const meta: SitemapMeta = {
      fingerprint: 'fp',
      generatedAt: '2026-07-05T00:00:00.000Z',
      files: ['sitemap.xml'],
      urlCount: 3
    };
    await storage.writeMeta(meta);
    expect(await storage.readMeta()).toEqual(meta);
  });

  it('prunes only stale sitemap files, never other public files', async () => {
    await storage.writeFiles([
      { name: 'sitemap.xml', content: '<x/>' },
      { name: 'sitemap-products.xml', content: '<x/>' },
      { name: 'sitemap-old.xml', content: '<x/>' }
    ]);
    await fsp.writeFile(path.join(publicDir, 'robots.txt'), 'User-agent: *');
    await fsp.writeFile(path.join(publicDir, 'favicon.ico'), 'icon');

    await storage.pruneOrphans(['sitemap.xml', 'sitemap-products.xml']);

    const remaining = await fsp.readdir(publicDir);
    expect(remaining).toEqual(
      expect.arrayContaining([
        'sitemap.xml',
        'sitemap-products.xml',
        'robots.txt',
        'favicon.ico'
      ])
    );
    expect(remaining).not.toContain('sitemap-old.xml');
  });

  it('leaves no .tmp files behind after an atomic write', async () => {
    await storage.writeFiles([{ name: 'sitemap.xml', content: '<x/>' }]);
    const remaining = await fsp.readdir(publicDir);
    expect(remaining.some((f) => f.includes('.tmp'))).toBe(false);
  });
});

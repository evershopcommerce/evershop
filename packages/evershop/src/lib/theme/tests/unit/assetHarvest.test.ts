import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { harvestAssets, looksLikeImage, themePathFor } from '../../assetHarvest.js';

// Export turns a store's images into a theme's assets: copy the file into the
// theme, swap the URL for a token, declare it. The author never writes assets[].
describe('themePathFor', () => {
  it('strips the URL builder prefixes and keeps the folder structure', () => {
    expect(themePathFor('/assets/demo/hero.jpg')).toBe('demo/hero.jpg');
    expect(themePathFor('/assets/media/2026/09/hero.jpg')).toBe('2026/09/hero.jpg');
    expect(themePathFor('https://bucket.s3.amazonaws.com/theme/t/demo/hero.jpg')).toBe(
      'theme/t/demo/hero.jpg'
    );
    expect(themePathFor('/assets/demo/hero.jpg?w=960')).toBe('demo/hero.jpg');
  });

  it('refuses anything that would escape the theme', () => {
    expect(themePathFor('/assets/../../etc/passwd')).toBeNull();
    expect(themePathFor('/assets/demo/')).toBeNull();
  });
});

describe('looksLikeImage', () => {
  it('recognises image files, not links, tokens or data URIs', () => {
    expect(looksLikeImage('/assets/a.jpg')).toBe(true);
    expect(looksLikeImage('https://cdn.example.com/a.PNG')).toBe(true);
    expect(looksLikeImage('/cakes/layer')).toBe(false);
    expect(looksLikeImage('theme-asset:demo/a.jpg')).toBe(false);
    expect(looksLikeImage('data:image/png;base64,AAAA')).toBe(false);
  });
});

describe('harvestAssets', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evershop-harvest-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const read = async (src: string) => Buffer.from(`BYTES:${src}`);

  it('copies each store image in, tokenises the setting and declares the asset', async () => {
    // Typed explicitly: an inline literal infers a union of the two settings
    // shapes, and the walker's job is precisely that it does not care what the
    // shape is.
    interface Fixture {
      widgets: {
        settings: {
          image?: string;
          heading?: string;
          tiles?: { image: string }[];
        };
      }[];
    }
    const manifest: Fixture = {
      widgets: [
        { settings: { image: '/assets/demo/hero.jpg', heading: 'Hello' } },
        { settings: { tiles: [{ image: '/assets/demo/icons/leaf.svg' }] } }
      ]
    };
    const r = await harvestAssets(manifest, { themeDir: dir, read });
    expect(r.value.widgets[0].settings.image).toBe('theme-asset:demo/hero.jpg');
    const tiles = r.value.widgets[1].settings.tiles ?? [];
    expect(tiles[0]?.image).toBe('theme-asset:demo/icons/leaf.svg');
    expect(r.value.widgets[0].settings.heading).toBe('Hello');
    expect(r.assets).toEqual([{ path: 'demo/hero.jpg' }, { path: 'demo/icons/leaf.svg' }]);
    expect(readFileSync(join(dir, 'public', 'demo', 'hero.jpg'), 'utf8')).toBe(
      'BYTES:/assets/demo/hero.jpg'
    );
    // The input manifest is untouched.
    expect(manifest.widgets[0].settings.image).toBe('/assets/demo/hero.jpg');
  });

  it('copies an image used by several widgets exactly once', async () => {
    let reads = 0;
    const counting = async (src: string) => {
      reads += 1;
      return Buffer.from(src);
    };
    const r = await harvestAssets(
      { a: { img: '/assets/shared.png' }, b: { img: '/assets/shared.png' } },
      { themeDir: dir, read: counting }
    );
    expect(reads).toBe(1);
    expect(r.assets).toEqual([{ path: 'shared.png' }]);
    expect(r.value.b.img).toBe('theme-asset:shared.png');
  });

  it("leaves someone else's image alone instead of re-hosting it", async () => {
    const r = await harvestAssets(
      { img: 'https://cdn.partner.example/logo.png' },
      { themeDir: dir, read, isStoreOwned: (v) => v.startsWith('/') }
    );
    expect(r.value.img).toBe('https://cdn.partner.example/logo.png');
    expect(r.assets).toEqual([]);
    expect(r.skipped).toEqual([
      { value: 'https://cdn.partner.example/logo.png', reason: 'external' }
    ]);
  });

  it('reports an unreadable file and leaves the setting pointing at the store', async () => {
    const failing = async () => {
      throw new Error('404');
    };
    const r = await harvestAssets({ img: '/assets/gone.jpg' }, { themeDir: dir, read: failing });
    expect(r.value.img).toBe('/assets/gone.jpg');
    expect(r.skipped).toEqual([{ value: '/assets/gone.jpg', reason: 'unreadable' }]);
  });

  it('is idempotent — a re-export of an already-harvested manifest changes nothing', async () => {
    const once = await harvestAssets({ img: '/assets/demo/hero.jpg' }, { themeDir: dir, read });
    const twice = await harvestAssets(once.value, { themeDir: dir, read });
    expect(twice.value).toEqual(once.value);
    expect(twice.assets).toEqual([]);
    expect(twice.harvested).toEqual([]);
  });
});

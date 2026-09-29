import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  assetDestination,
  assetToken,
  collectAssetTokens,
  isSafeAssetPath,
  mimeFor,
  resolveAssetTokens,
  uploadThemeAssets
} from '../../assets.js';

describe('theme asset paths', () => {
  it('accepts a relative path with an extension', () => {
    expect(isSafeAssetPath('demo/hero.jpg')).toBe(true);
    expect(isSafeAssetPath('hero.png')).toBe(true);
  });

  it('rejects anything that could read outside the theme', () => {
    for (const bad of [
      '../secrets.env',
      'demo/../../etc/passwd',
      '/etc/passwd',
      'C:/windows/system.ini',
      'demo\\hero.jpg',
      'demo//hero.jpg',
      '',
      'demo/hero',
      42,
      null
    ]) {
      expect(isSafeAssetPath(bad)).toBe(false);
    }
  });

  it('lands a file under theme/<id>/ keeping its folder and name', () => {
    expect(assetDestination('cake-shop', 'demo/hero.jpg')).toEqual({
      destination: 'theme/cake-shop/demo',
      filename: 'hero.jpg'
    });
    expect(assetDestination('cake-shop', 'hero.jpg')).toEqual({
      destination: 'theme/cake-shop',
      filename: 'hero.jpg'
    });
  });

  it('types files by extension', () => {
    expect(mimeFor('a/b.jpg')).toBe('image/jpeg');
    expect(mimeFor('a/b.SVG')).toBe('image/svg+xml');
    expect(mimeFor('a/b.bin')).toBe('application/octet-stream');
  });
});

describe('asset tokens', () => {
  const settings = {
    image: assetToken('demo/hero.jpg'),
    nested: { list: [{ src: 'theme-asset:demo/icons/leaf.svg' }] },
    untouched: '/media/real-upload.jpg',
    number: 3
  };

  it('finds every token in a value tree', () => {
    expect([...collectAssetTokens(settings)].sort()).toEqual([
      'demo/hero.jpg',
      'demo/icons/leaf.svg'
    ]);
  });

  it('replaces tokens with uploaded URLs and leaves everything else alone', () => {
    const urls = new Map([
      ['demo/hero.jpg', 'https://bucket.s3.eu-west-1.amazonaws.com/theme/t/demo/hero.jpg']
    ]);
    const out = resolveAssetTokens(settings, urls);
    expect(out.image).toBe('https://bucket.s3.eu-west-1.amazonaws.com/theme/t/demo/hero.jpg');
    // Not uploaded: left as the token, so a failed upload cannot write a broken URL.
    expect(out.nested.list[0].src).toBe('theme-asset:demo/icons/leaf.svg');
    expect(out.untouched).toBe('/media/real-upload.jpg');
    expect(out.number).toBe(3);
    // The input is untouched — the snapshot keeps the authored form.
    expect(settings.image).toBe('theme-asset:demo/hero.jpg');
  });

  it('is a no-op when nothing was uploaded', () => {
    expect(resolveAssetTokens(settings, new Map())).toBe(settings);
  });
});

describe('uploadThemeAssets', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evershop-assets-'));
  beforeAll(() => {
    mkdirSync(join(dir, 'public', 'demo'), { recursive: true });
    writeFileSync(join(dir, 'public', 'demo', 'hero.jpg'), 'JPEGDATA');
    writeFileSync(join(dir, 'public', 'flat.png'), 'PNGDATA');
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('uploads each declared file through the injected provider, grouped by folder', async () => {
    const calls: { destination: string; names: string[] }[] = [];
    const upload = async (files, destination) => {
      calls.push({ destination, names: files.map((f) => f.filename) });
      return files.map((f) => ({ name: f.filename, url: `https://cdn/${destination}/${f.filename}` }));
    };
    const result = await uploadThemeAssets(
      dir,
      'cake-shop',
      [{ path: 'demo/hero.jpg' }, { path: 'flat.png' }],
      upload
    );
    expect(calls).toEqual([
      { destination: 'theme/cake-shop/demo', names: ['hero.jpg'] },
      { destination: 'theme/cake-shop', names: ['flat.png'] }
    ]);
    expect(result.urls.get('demo/hero.jpg')).toBe('https://cdn/theme/cake-shop/demo/hero.jpg');
    expect(result.missing).toEqual([]);
    expect(result.uploaded).toHaveLength(2);
  });

  it('reports a declared file that is not in the theme instead of throwing', async () => {
    const upload = async (files, destination) =>
      files.map((f) => ({ name: f.filename, url: `https://cdn/${destination}/${f.filename}` }));
    const result = await uploadThemeAssets(dir, 't', [{ path: 'demo/gone.jpg' }], upload);
    expect(result.missing).toEqual(['demo/gone.jpg']);
    expect(result.urls.size).toBe(0);
  });

  it('sends the file contents and a real mime type', async () => {
    let seen;
    const upload = async (files) => {
      seen = files[0];
      return [{ name: files[0].filename, url: '/x' }];
    };
    await uploadThemeAssets(dir, 't', [{ path: 'demo/hero.jpg' }], upload);
    expect(seen.buffer.toString()).toBe('JPEGDATA');
    expect(seen.mimetype).toBe('image/jpeg');
    expect(seen.size).toBe(8);
  });
});

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { jest } from '@jest/globals';

/**
 * A theme ships its photos in its own `public/` folder and names them
 * relatively in its seed data. Only product images went through the store's
 * file storage; a category image or a blog thumbnail was written to the
 * database verbatim and 404'd on the storefront.
 */
const themeDir = mkdtempSync(join(tmpdir(), 'evershop-theme-img-'));
let activeTheme: { name: string; path: string } | null = null;
const uploads: { filename: string; mimetype: string; dest: string }[] = [];
let routesLoaded = 0;

jest.unstable_mockModule('../../../../lib/util/getEnabledTheme.js', () => ({
  getEnabledTheme: () => activeTheme
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  info: () => undefined,
  success: () => undefined,
  warning: () => undefined,
  error: () => undefined
}));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {}
}));
jest.unstable_mockModule('../../../lib/ensureRoutesLoaded.js', () => ({
  ensureRoutesLoaded: () => {
    routesLoaded += 1;
  }
}));
jest.unstable_mockModule('../../../../modules/cms/services/uploadFile.js', () => ({
  uploadFile: async (files: any[], dest: string) => {
    uploads.push({
      filename: files[0].filename,
      mimetype: files[0].mimetype,
      dest
    });
    return [{ url: `/assets/${dest}/${files[0].filename}` }];
  }
}));

const { uploadThemeSeedImage } = await import('../../seedImages.js');

beforeAll(() => {
  mkdirSync(join(themeDir, 'public', 'demo'), { recursive: true });
  writeFileSync(join(themeDir, 'public', 'demo', 'cat-women.jpg'), 'JPEG');
  writeFileSync(join(themeDir, 'public', 'demo', 'logo.png'), 'PNG');
});
afterAll(() => rmSync(themeDir, { recursive: true, force: true }));
beforeEach(() => {
  activeTheme = { name: 'atelier', path: themeDir };
  uploads.length = 0;
  routesLoaded = 0;
});

describe('uploadThemeSeedImage', () => {
  it('uploads a theme-local photo and returns its served URL', async () => {
    const url = await uploadThemeSeedImage('demo/cat-women.jpg', 'catalog');
    expect(url).toMatch(/^\/assets\/catalog\/\d+\/\d+\/cat-women\.jpg$/);
    expect(uploads).toHaveLength(1);
    expect(uploads[0].mimetype).toBe('image/jpeg');
  });

  it('loads the route registry first, or the local provider cannot build a URL', async () => {
    await uploadThemeSeedImage('demo/cat-women.jpg', 'catalog');
    expect(routesLoaded).toBe(1);
  });

  it('reads the mimetype from the extension', async () => {
    await uploadThemeSeedImage('demo/logo.png', 'blog');
    expect(uploads[0].mimetype).toBe('image/png');
  });

  it('leaves an absolute URL alone so core seed data is unaffected', async () => {
    const url = await uploadThemeSeedImage(
      'https://picsum.photos/seed/x/1200/675',
      'blog'
    );
    expect(url).toBeNull();
    expect(uploads).toHaveLength(0);
  });

  it('returns null for a path the theme does not ship', async () => {
    expect(await uploadThemeSeedImage('demo/missing.jpg', 'blog')).toBeNull();
    expect(uploads).toHaveLength(0);
  });

  it('refuses to climb out of the theme folder', async () => {
    expect(await uploadThemeSeedImage('../../../etc/passwd', 'blog')).toBeNull();
    expect(uploads).toHaveLength(0);
  });

  it('does nothing when no theme is active', async () => {
    activeTheme = null;
    expect(await uploadThemeSeedImage('demo/cat-women.jpg', 'catalog')).toBeNull();
  });

  it('ignores an empty reference', async () => {
    expect(await uploadThemeSeedImage(undefined, 'catalog')).toBeNull();
    expect(await uploadThemeSeedImage(null, 'catalog')).toBeNull();
    expect(await uploadThemeSeedImage('', 'catalog')).toBeNull();
  });
});

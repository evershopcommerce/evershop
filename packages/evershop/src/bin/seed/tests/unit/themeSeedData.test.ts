import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { jest } from '@jest/globals';

// A demo theme only reads as a demo with content that matches it, so a theme
// may supply its own seed files. Per file, replacing core's, and only for the
// `seed` command — activation still creates nothing.
const themeDir = mkdtempSync(join(tmpdir(), 'evershop-theme-'));
const coreDir = mkdtempSync(join(tmpdir(), 'evershop-seed-'));
let activeTheme: { name: string; path: string } | null = null;

jest.unstable_mockModule('../../../../lib/util/getEnabledTheme.js', () => ({
  getEnabledTheme: () => activeTheme
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  info: () => undefined,
  success: () => undefined,
  warning: () => undefined,
  error: () => undefined
}));

const { resolveSeedData, resolveSeedImage, themeSeedFile } = await import(
  '../../themeSeedData.js'
);

beforeAll(() => {
  mkdirSync(join(themeDir, 'seed'), { recursive: true });
  mkdirSync(join(themeDir, 'public', 'demo'), { recursive: true });
  writeFileSync(join(themeDir, 'seed', 'products.json'), JSON.stringify([{ sku: 'ATL-1' }]));
  writeFileSync(join(themeDir, 'public', 'demo', 'product-01.jpg'), 'PHOTO');
  writeFileSync(join(coreDir, 'products.json'), JSON.stringify([{ sku: 'CORE-1' }]));
  writeFileSync(join(coreDir, 'attributes.json'), JSON.stringify([{ code: 'colour' }]));
});
afterAll(() => {
  rmSync(themeDir, { recursive: true, force: true });
  rmSync(coreDir, { recursive: true, force: true });
});
beforeEach(() => {
  activeTheme = { name: 'atelier', path: themeDir };
});

describe('theme seed data', () => {
  it("takes the theme's file when it has one, and says so", () => {
    const { data, source } = resolveSeedData<{ sku: string }[]>('products', coreDir);
    expect(data).toEqual([{ sku: 'ATL-1' }]);
    expect(source.origin).toBe('theme');
    expect(source.themeName).toBe('atelier');
  });

  it("falls back to core's file per FILE, not all or nothing", () => {
    const { data, source } = resolveSeedData<{ code: string }[]>('attributes', coreDir);
    expect(data).toEqual([{ code: 'colour' }]);
    expect(source.origin).toBe('core');
  });

  it('uses core everywhere when no theme is active', () => {
    activeTheme = null;
    expect(themeSeedFile('products')).toBeNull();
    expect(resolveSeedData('products', coreDir).source.origin).toBe('core');
  });
});

describe('theme seed images', () => {
  it("resolves a relative reference inside the theme's public folder", () => {
    expect(resolveSeedImage('demo/product-01.jpg')).toBe(
      join(themeDir, 'public', 'demo', 'product-01.jpg')
    );
    expect(resolveSeedImage('/demo/product-01.jpg')).toBe(
      join(themeDir, 'public', 'demo', 'product-01.jpg')
    );
  });

  it('leaves a URL alone, so core data still downloads', () => {
    expect(resolveSeedImage('https://example.com/a.jpg')).toBeNull();
  });

  it('refuses a path that escapes the theme, and a file that is not there', () => {
    expect(resolveSeedImage('../../etc/passwd')).toBeNull();
    expect(resolveSeedImage('demo/missing.jpg')).toBeNull();
  });
});

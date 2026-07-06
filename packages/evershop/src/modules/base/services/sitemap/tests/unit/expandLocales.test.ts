import { expandLocales } from '../../expandLocales.js';
import { SitemapEntry } from '../../types.js';

const BASE = 'https://shop.com';
const entry = (path: string, extra: Partial<SitemapEntry> = {}): SitemapEntry => ({
  path,
  ...extra
});

describe('expandLocales', () => {
  describe('single-locale store', () => {
    it('emits one unprefixed record per entry, no alternates', () => {
      const out = expandLocales(
        [entry('/shoes', { lastmod: '2026-01-01T00:00:00.000Z' })],
        { locales: ['en'], defaultLocale: 'en', baseUrl: BASE }
      );
      expect(out).toHaveLength(1);
      expect(out[0].loc).toBe('https://shop.com/shoes');
      expect(out[0].lastmod).toBe('2026-01-01T00:00:00.000Z');
      expect(out[0].alternates).toBeUndefined();
    });

    it('falls back to [defaultLocale] when locales is empty', () => {
      const out = expandLocales([entry('/shoes')], {
        locales: [],
        defaultLocale: 'en',
        baseUrl: BASE
      });
      expect(out).toHaveLength(1);
      expect(out[0].loc).toBe('https://shop.com/shoes');
      expect(out[0].alternates).toBeUndefined();
    });
  });

  describe('multi-locale store', () => {
    const opts = { locales: ['en', 'de', 'fr'], defaultLocale: 'en', baseUrl: BASE };

    it('emits one prefixed record per enabled locale', () => {
      const out = expandLocales([entry('/shoes')], opts);
      expect(out.map((r) => r.loc)).toEqual([
        'https://shop.com/shoes',
        'https://shop.com/de/shoes',
        'https://shop.com/fr/shoes'
      ]);
    });

    it('attaches the full self-referential alternate set + x-default to every record', () => {
      const out = expandLocales([entry('/shoes')], opts);
      const expected = [
        { hreflang: 'en', href: 'https://shop.com/shoes' },
        { hreflang: 'de', href: 'https://shop.com/de/shoes' },
        { hreflang: 'fr', href: 'https://shop.com/fr/shoes' },
        { hreflang: 'x-default', href: 'https://shop.com/shoes' }
      ];
      for (const record of out) {
        expect(record.alternates).toEqual(expected);
      }
    });

    it('localizes the homepage to /<locale>, never /<locale>/', () => {
      const out = expandLocales([entry('/')], opts);
      expect(out.map((r) => r.loc)).toEqual([
        'https://shop.com/',
        'https://shop.com/de',
        'https://shop.com/fr'
      ]);
      expect(out[0].alternates).toContainEqual({
        hreflang: 'x-default',
        href: 'https://shop.com/'
      });
      expect(out[1].alternates).toContainEqual({
        hreflang: 'de',
        href: 'https://shop.com/de'
      });
    });

    it('drops alternates when hreflang is false but keeps per-locale records', () => {
      const out = expandLocales([entry('/shoes')], { ...opts, hreflang: false });
      expect(out).toHaveLength(3);
      for (const record of out) {
        expect(record.alternates).toBeUndefined();
      }
      expect(out.map((r) => r.loc)).toEqual([
        'https://shop.com/shoes',
        'https://shop.com/de/shoes',
        'https://shop.com/fr/shoes'
      ]);
    });

    it('normalizes hreflang codes (underscore→hyphen) but keeps the raw URL segment', () => {
      const out = expandLocales([entry('/shoes')], {
        locales: ['en', 'pt_br'],
        defaultLocale: 'en',
        baseUrl: BASE
      });
      expect(out[1].loc).toBe('https://shop.com/pt_br/shoes');
      expect(out[1].alternates).toContainEqual({
        hreflang: 'pt-br',
        href: 'https://shop.com/pt_br/shoes'
      });
    });

    it('passes already-absolute paths through unchanged (no prefix)', () => {
      const out = expandLocales([entry('https://cdn.example.com/x')], opts);
      for (const record of out) {
        expect(record.loc).toBe('https://cdn.example.com/x');
      }
    });

    it('preserves changefreq and priority on every locale record', () => {
      const out = expandLocales(
        [entry('/shoes', { changefreq: 'daily', priority: 0.7 })],
        opts
      );
      for (const record of out) {
        expect(record.changefreq).toBe('daily');
        expect(record.priority).toBe(0.7);
      }
    });
  });
});

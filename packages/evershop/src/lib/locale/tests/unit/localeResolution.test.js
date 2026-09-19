import { describe, it, expect } from '@jest/globals';
import {
  normalizeLocale,
  mergeEnabledLocales,
  pickStorefrontLocale,
  pickApiLocale,
  switchLocalePath,
  buildHreflangAlternates
} from '../../localeResolution.js';

describe('normalizeLocale', () => {
  it('trims and lowercases', () => {
    expect(normalizeLocale('FR')).toBe('fr');
    expect(normalizeLocale('  De ')).toBe('de');
  });

  it('treats empty / non-string as undefined', () => {
    expect(normalizeLocale('')).toBeUndefined();
    expect(normalizeLocale('   ')).toBeUndefined();
    expect(normalizeLocale(null)).toBeUndefined();
    expect(normalizeLocale(undefined)).toBeUndefined();
    expect(normalizeLocale(42)).toBeUndefined();
  });

  it('does not remap codes — an invalid locale stays as-is (rejected later → 404)', () => {
    // The locale code in a URL must match an enabled locale exactly; a non-ISO code
    // like `vn` is NOT silently rewritten to `vi`, so `/vn` falls through to 404.
    expect(normalizeLocale('vn')).toBe('vn');
    expect(normalizeLocale('xx')).toBe('xx');
  });
});

describe('mergeEnabledLocales', () => {
  it('unions the default with the list, default first, deduped + normalized', () => {
    expect(mergeEnabledLocales('en', ['fr', 'de'])).toEqual(['en', 'fr', 'de']);
    expect(mergeEnabledLocales('en', ['EN', 'fr', 'fr'])).toEqual(['en', 'fr']);
    expect(mergeEnabledLocales('fr', ['en'])).toEqual(['fr', 'en']);
  });

  it('collapses to [default] for empty / absent / non-array lists', () => {
    expect(mergeEnabledLocales('en', [])).toEqual(['en']);
    expect(mergeEnabledLocales('en', undefined)).toEqual(['en']);
    expect(mergeEnabledLocales('en', null)).toEqual(['en']);
    expect(mergeEnabledLocales('en', 'fr')).toEqual(['en']); // non-array ignored
  });

  it('drops empty / invalid entries', () => {
    expect(mergeEnabledLocales('en', ['', '  ', 'fr', 5])).toEqual(['en', 'fr']);
  });
});

describe('pickStorefrontLocale', () => {
  const enabled = ['en', 'fr', 'de'];

  it('prefixes an enabled, non-default locale', () => {
    expect(pickStorefrontLocale('fr', enabled, 'en')).toEqual({
      locale: 'fr',
      isPrefixed: true
    });
  });

  it('is case-insensitive on the segment', () => {
    expect(pickStorefrontLocale('FR', enabled, 'en')).toEqual({
      locale: 'fr',
      isPrefixed: true
    });
  });

  it('never prefixes the default locale (even if it appears as a segment)', () => {
    expect(pickStorefrontLocale('en', enabled, 'en')).toEqual({
      locale: 'en',
      isPrefixed: false
    });
  });

  it('falls through to the default for a non-enabled locale', () => {
    expect(pickStorefrontLocale('it', enabled, 'en')).toEqual({
      locale: 'en',
      isPrefixed: false
    });
  });

  it('falls through to the default for a real route segment', () => {
    expect(pickStorefrontLocale('catalog', enabled, 'en')).toEqual({
      locale: 'en',
      isPrefixed: false
    });
  });

  it('falls through to the default for an empty segment (home page)', () => {
    expect(pickStorefrontLocale('', enabled, 'en')).toEqual({
      locale: 'en',
      isPrefixed: false
    });
    expect(pickStorefrontLocale(undefined, enabled, 'en')).toEqual({
      locale: 'en',
      isPrefixed: false
    });
  });
});

describe('pickApiLocale', () => {
  const enabled = ['en', 'fr', 'de'];

  it('honors an enabled locale from the header', () => {
    expect(pickApiLocale('fr', enabled, 'en')).toBe('fr');
  });

  it('is case-insensitive', () => {
    expect(pickApiLocale('FR', enabled, 'en')).toBe('fr');
  });

  it('falls back to the default for a disabled / unknown locale', () => {
    expect(pickApiLocale('it', enabled, 'en')).toBe('en');
    expect(pickApiLocale('de', ['en', 'fr'], 'en')).toBe('en');
  });

  it('falls back to the default for a missing / empty / non-string header', () => {
    expect(pickApiLocale(undefined, enabled, 'en')).toBe('en');
    expect(pickApiLocale('', enabled, 'en')).toBe('en');
    expect(pickApiLocale(['fr'], enabled, 'en')).toBe('en');
    expect(pickApiLocale(42, enabled, 'en')).toBe('en');
  });

  it('returns the default when the default itself is the only enabled locale', () => {
    expect(pickApiLocale('fr', ['en'], 'en')).toBe('en');
  });
});

describe('switchLocalePath', () => {
  const enabled = ['en', 'fr', 'de'];

  it('default → non-default: adds the prefix', () => {
    expect(switchLocalePath('/catalog/x', 'fr', 'en', enabled)).toBe(
      '/fr/catalog/x'
    );
  });

  it('non-default → default: strips the prefix', () => {
    expect(switchLocalePath('/fr/catalog/x', 'en', 'en', enabled)).toBe(
      '/catalog/x'
    );
  });

  it('non-default → other non-default: swaps the prefix', () => {
    expect(switchLocalePath('/fr/catalog/x', 'de', 'en', enabled)).toBe(
      '/de/catalog/x'
    );
  });

  it('home: default → non-default → /<locale> (no trailing slash)', () => {
    expect(switchLocalePath('/', 'fr', 'en', enabled)).toBe('/fr');
  });

  it('home: non-default → default → /', () => {
    expect(switchLocalePath('/fr', 'en', 'en', enabled)).toBe('/');
  });

  it('switching to the same (non-default) locale is a no-op path', () => {
    expect(switchLocalePath('/fr/x', 'fr', 'en', enabled)).toBe('/fr/x');
  });

  it('does not treat a non-locale first segment as a prefix', () => {
    expect(switchLocalePath('/catalog/fr', 'fr', 'en', enabled)).toBe(
      '/fr/catalog/fr'
    );
  });

  it('is case-insensitive on the target locale', () => {
    expect(switchLocalePath('/catalog', 'FR', 'en', enabled)).toBe(
      '/fr/catalog'
    );
  });
});

describe('buildHreflangAlternates', () => {
  const enabled = ['en', 'fr', 'de'];
  const base = 'https://shop.test';

  it('emits one absolute URL per enabled locale + x-default (default-locale page)', () => {
    expect(buildHreflangAlternates('/catalog/x', 'en', enabled, base)).toEqual([
      { hreflang: 'en', href: 'https://shop.test/catalog/x' },
      { hreflang: 'fr', href: 'https://shop.test/fr/catalog/x' },
      { hreflang: 'de', href: 'https://shop.test/de/catalog/x' },
      { hreflang: 'x-default', href: 'https://shop.test/catalog/x' }
    ]);
  });

  it('is independent of which locale the current page is under (strips the prefix)', () => {
    expect(buildHreflangAlternates('/fr/catalog/x', 'en', enabled, base)).toEqual(
      buildHreflangAlternates('/catalog/x', 'en', enabled, base)
    );
  });

  it('handles the home page (no trailing slash on prefixed locales)', () => {
    expect(buildHreflangAlternates('/', 'en', enabled, base)).toEqual([
      { hreflang: 'en', href: 'https://shop.test/' },
      { hreflang: 'fr', href: 'https://shop.test/fr' },
      { hreflang: 'de', href: 'https://shop.test/de' },
      { hreflang: 'x-default', href: 'https://shop.test/' }
    ]);
  });

  it('preserves the query string so each alternate matches the page canonical', () => {
    expect(
      buildHreflangAlternates('/fr/catalog?page=2', 'en', enabled, base)
    ).toEqual([
      { hreflang: 'en', href: 'https://shop.test/catalog?page=2' },
      { hreflang: 'fr', href: 'https://shop.test/fr/catalog?page=2' },
      { hreflang: 'de', href: 'https://shop.test/de/catalog?page=2' },
      { hreflang: 'x-default', href: 'https://shop.test/catalog?page=2' }
    ]);
  });

  it('returns [] for a single-locale store (no alternates needed)', () => {
    expect(buildHreflangAlternates('/catalog/x', 'en', ['en'], base)).toEqual([]);
  });

  it('returns [] for an empty / non-array enabled set', () => {
    expect(buildHreflangAlternates('/x', 'en', [], base)).toEqual([]);
    expect(buildHreflangAlternates('/x', 'en', undefined, base)).toEqual([]);
  });
});

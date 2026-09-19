import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  loadLocale,
  loadAllLocales,
  reloadLocale,
  getDictionary,
  getAvailableLocales,
  getPageDictionary,
  composeLocaleDictionary
} from '../../dictionary.js';

/**
 * Runs against the repository's committed `translations/` fixtures —
 * `CONSTANTS.ROOTPATH` resolves to the repo root. `fr` and `de` are long-standing
 * sample locales that ship CSV files. Assertions are content/behavior based; the
 * registry's `getValue` caches by deep-equality, so object-reference checks are
 * intentionally avoided.
 */

beforeAll(async () => {
  await loadAllLocales();
});

describe('dictionary — loadLocale (disk)', () => {
  it('loads a real locale folder into a non-empty map', async () => {
    const fr = await loadLocale('fr');
    expect(typeof fr).toBe('object');
    expect(Object.keys(fr).length).toBeGreaterThan(0);
  });

  it('returns an empty object for a locale that has no folder', async () => {
    expect(await loadLocale('__no_such_locale__')).toEqual({});
  });
});

describe('dictionary — registry', () => {
  it('discovers the committed locale folders', () => {
    const locales = getAvailableLocales();
    expect(locales.length).toBeGreaterThan(0);
    expect(locales).toEqual(expect.arrayContaining(['fr', 'de']));
  });

  it('getDictionary returns the loaded map for a known locale', () => {
    expect(Object.keys(getDictionary('fr')).length).toBeGreaterThan(0);
  });

  it('getDictionary returns {} for an unknown locale (source-string fallback)', () => {
    expect(getDictionary('__no_such_locale__')).toEqual({});
  });
});

describe('dictionary — getPageDictionary', () => {
  it('memoizes per (route, locale): repeat calls return the same reference', () => {
    const a = getPageDictionary('homepage', 'fr');
    const b = getPageDictionary('homepage', 'fr');
    expect(b).toBe(a);
  });

  it('(P1) returns the full locale dictionary until the per-route manifest exists', () => {
    expect(getPageDictionary('catalogView', 'fr')).toEqual(getDictionary('fr'));
  });
});

describe('dictionary — composeLocaleDictionary (override seam, §6.20)', () => {
  it('is identity when no localeDictionary processor is registered', async () => {
    const base = { 'Add to cart': 'Ajouter au panier' };
    expect(await composeLocaleDictionary('fr', base)).toEqual(base);
  });
});

describe('dictionary — reloadLocale', () => {
  it('rebuilds a locale and keeps it populated; page slice stays consistent', async () => {
    await reloadLocale('fr');
    expect(Object.keys(getDictionary('fr')).length).toBeGreaterThan(0);
    // After a reload the page slice is recomputed and still matches the full dict.
    expect(getPageDictionary('homepage', 'fr')).toEqual(getDictionary('fr'));
  });
});

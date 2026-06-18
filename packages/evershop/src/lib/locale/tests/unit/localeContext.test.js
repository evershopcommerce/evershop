import { describe, it, expect } from '@jest/globals';
import {
  runWithLocale,
  getLocaleContext,
  getActiveLocale,
  getRequestDictionary,
  localizeUrl
} from '../../localeContext.js';
import { applyLocalePrefix } from '../../activeDictionary.js';

const ctx = (over = {}) => ({
  locale: 'fr',
  defaultLocale: 'en',
  available: ['en', 'fr', 'de'],
  dict: { Home: 'Accueil' },
  isAdmin: false,
  ...over
});

describe('localeContext — AsyncLocalStorage', () => {
  it('exposes the context inside runWithLocale', () => {
    runWithLocale(ctx(), () => {
      expect(getLocaleContext()).toMatchObject({ locale: 'fr', isAdmin: false });
      expect(getActiveLocale()).toBe('fr');
      expect(getRequestDictionary()).toEqual({ Home: 'Accueil' });
    });
  });

  it('has no context outside any scope (dict empty, locale falls back to config)', () => {
    expect(getLocaleContext()).toBeUndefined();
    expect(getRequestDictionary()).toEqual({});
    expect(typeof getActiveLocale()).toBe('string'); // getConfig('shop.language','en')
  });

  it('propagates across async boundaries', async () => {
    await runWithLocale(ctx({ locale: 'de' }), async () => {
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 1));
      expect(getActiveLocale()).toBe('de');
    });
  });

  it('isolates concurrent scopes', async () => {
    const seen = [];
    await Promise.all([
      runWithLocale(ctx({ locale: 'fr' }), async () => {
        await new Promise((r) => setTimeout(r, 5));
        seen.push(getActiveLocale());
      }),
      runWithLocale(ctx({ locale: 'de' }), async () => {
        await new Promise((r) => setTimeout(r, 1));
        seen.push(getActiveLocale());
      })
    ]);
    expect(seen.sort()).toEqual(['de', 'fr']);
  });
});

describe('localeContext — applyLocalePrefix', () => {
  it('prefixes a non-default storefront locale', () => {
    expect(
      applyLocalePrefix('/shoes', { locale: 'fr', defaultLocale: 'en', isAdmin: false })
    ).toBe('/fr/shoes');
  });

  it('does not prefix the default locale', () => {
    expect(
      applyLocalePrefix('/shoes', { locale: 'en', defaultLocale: 'en', isAdmin: false })
    ).toBe('/shoes');
  });

  it('does not prefix when the current context is admin', () => {
    expect(
      applyLocalePrefix('/shoes', { locale: 'fr', defaultLocale: 'en', isAdmin: true })
    ).toBe('/shoes');
  });

  it('does not prefix when the target route is admin', () => {
    expect(
      applyLocalePrefix('/x', { locale: 'fr', defaultLocale: 'en', isAdmin: false }, true)
    ).toBe('/x');
  });

  it('does not prefix when there is no context', () => {
    expect(applyLocalePrefix('/shoes', undefined)).toBe('/shoes');
  });

  it('normalizes the root to /<locale> (no trailing slash)', () => {
    expect(
      applyLocalePrefix('/', { locale: 'fr', defaultLocale: 'en', isAdmin: false })
    ).toBe('/fr');
  });

  it('leaves the root as / for the default locale', () => {
    expect(
      applyLocalePrefix('/', { locale: 'en', defaultLocale: 'en', isAdmin: false })
    ).toBe('/');
  });

  it('never prefixes a RESTful /api path (D4)', () => {
    const ctx = { locale: 'fr', defaultLocale: 'en', isAdmin: false };
    expect(applyLocalePrefix('/api/cart/mine/items', ctx)).toBe(
      '/api/cart/mine/items'
    );
    expect(applyLocalePrefix('/api', ctx)).toBe('/api');
    expect(applyLocalePrefix('/api/customers?x=1', ctx)).toBe(
      '/api/customers?x=1'
    );
  });

  it('still prefixes a page route whose name merely starts with "api"', () => {
    expect(
      applyLocalePrefix('/api-docs', {
        locale: 'fr',
        defaultLocale: 'en',
        isAdmin: false
      })
    ).toBe('/fr/api-docs');
  });
});

describe('localeContext — localizeUrl', () => {
  it('prefixes inside a non-default storefront scope', () => {
    runWithLocale(ctx({ locale: 'fr', isAdmin: false }), () => {
      expect(localizeUrl('/shoes')).toBe('/fr/shoes');
    });
  });

  it('is a no-op inside an admin scope', () => {
    runWithLocale(ctx({ locale: 'fr', isAdmin: true }), () => {
      expect(localizeUrl('/shoes')).toBe('/shoes');
    });
  });

  it('is a no-op outside any scope', () => {
    expect(localizeUrl('/shoes')).toBe('/shoes');
  });
});

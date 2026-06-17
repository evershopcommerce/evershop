import { describe, it, expect, beforeAll } from '@jest/globals';
import { translate } from '../../translate/translate.js';
import { loadAllLocales } from '../../dictionary.js';
import { runWithLocale } from '../../localeContext.js';

const scope = (dict, fn) =>
  runWithLocale(
    { locale: 'fr', defaultLocale: 'en', available: ['en', 'fr'], dict, isAdmin: false },
    fn
  );

beforeAll(async () => {
  // Populate the registry so the explicit-locale and off-scope fallback paths resolve.
  await loadAllLocales();
});

describe('translate — dictionary precedence', () => {
  it('uses the request ALS dictionary inside runWithLocale', () => {
    scope({ Hi: 'Bonjour' }, () => {
      expect(translate('Hi')).toBe('Bonjour');
    });
  });

  it('falls back to the source string for a missing key', () => {
    scope({ Hi: 'Bonjour' }, () => {
      expect(translate('Not translated')).toBe('Not translated');
    });
  });

  it('an explicit locale bypasses the ALS dictionary', () => {
    scope({ Hi: 'Bonjour-from-ALS' }, () => {
      // explicit 'fr' reads the registry dict, not the ALS dict; 'Hi' is not a real fr key
      expect(translate('Hi', {}, 'fr')).toBe('Hi');
    });
  });

  it('off-scope returns the source for an unknown key (default-locale registry fallback)', () => {
    expect(translate('___no_such_key___')).toBe('___no_such_key___');
  });
});

describe('translate — interpolation', () => {
  it('substitutes ${vars} after the lookup', () => {
    scope({ 'Hi ${name}': 'Salut ${name}' }, () => {
      expect(translate('Hi ${name}', { name: 'Lee' })).toBe('Salut Lee');
    });
  });

  it('leaves unknown ${vars} untouched', () => {
    expect(translate('Hello ${who}', { other: 'x' })).toBe('Hello ${who}');
  });
});

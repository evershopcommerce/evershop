import { describe, it, expect, afterEach } from '@jest/globals';
import { _ } from '../../translate/_.js';
import { setSSRContext } from '../../activeDictionary.js';

const reset = () => setSSRContext({ locale: '', defaultLocale: '', isAdmin: false }, {});

afterEach(reset);

describe('_ (client/template translate)', () => {
  it('returns the source string when the active dictionary is empty', () => {
    reset();
    expect(_('Add to cart')).toBe('Add to cart');
  });

  it('returns the translation when present in the active dictionary', () => {
    setSSRContext(
      { locale: 'fr', defaultLocale: 'en', isAdmin: false },
      { 'Add to cart': 'Ajouter au panier' }
    );
    expect(_('Add to cart')).toBe('Ajouter au panier');
  });

  it('interpolates ${vars} after the lookup', () => {
    setSSRContext(
      { locale: 'fr', defaultLocale: 'en', isAdmin: false },
      { 'Hi ${name}': 'Salut ${name}' }
    );
    expect(_('Hi ${name}', { name: 'Lee' })).toBe('Salut Lee');
  });

  it('interpolates even when the string has no translation', () => {
    reset();
    expect(_('Hello ${name}', { name: 'Lee' })).toBe('Hello Lee');
  });

  it('leaves unknown ${vars} untouched', () => {
    reset();
    expect(_('Hello ${who}', { name: 'Lee' })).toBe('Hello ${who}');
  });
});

import { describe, it, expect } from '@jest/globals';
import { extractTranslationKeys } from '../../getTranslatableKeys.js';

// Source inputs are plain (double-quoted) JS strings so `${...}` is NOT interpolated.

describe('extractTranslationKeys', () => {
  it('extracts single- and double-quoted literal keys, in order', () => {
    expect(extractTranslationKeys("_('Add to cart'); _(\"Search\")")).toEqual([
      'Add to cart',
      'Search'
    ]);
  });

  it('keeps ${var} placeholders in the key', () => {
    expect(extractTranslationKeys("_('Discount ${x} off', { x })")).toEqual([
      'Discount ${x} off'
    ]);
  });

  it('unescapes an escaped quote inside the literal', () => {
    expect(extractTranslationKeys("_('It\\'s here')")).toEqual(["It's here"]);
  });

  it('dedupes repeated keys', () => {
    expect(extractTranslationKeys("_('A'); foo(); _('A'); _('A')")).toEqual([
      'A'
    ]);
  });

  it('ignores dynamic (non-literal) _() calls', () => {
    expect(extractTranslationKeys('_(someVar); _(x + y)')).toEqual([]);
  });

  it('does not match foo_( / obj._( (not the translate function)', () => {
    expect(
      extractTranslationKeys("foo_('x'); obj._('y'); a.b._('z')")
    ).toEqual([]);
  });

  it('returns [] when there are no _() calls', () => {
    expect(extractTranslationKeys("const a = 1; t('hello');")).toEqual([]);
  });
});

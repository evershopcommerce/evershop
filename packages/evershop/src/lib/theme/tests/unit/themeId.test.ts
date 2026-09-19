import { assertValidThemeId, isValidThemeId } from '../../themeId.js';

describe('themeId', () => {
  test.each(['a', 'boutique', 'theme-1', 'theme_1', '0abc', 'a'.repeat(64)])(
    'valid: %s',
    (id) => {
      expect(isValidThemeId(id)).toBe(true);
    }
  );

  test.each([
    ['empty', ''],
    ['uppercase', 'A'],
    ['mixed case', 'Boutique'],
    ['leading hyphen', '-leading'],
    ['punctuation', 'boutique!'],
    ['leading space', ' boutique'],
    ['too long', 'a'.repeat(65)],
    ['non-ascii', 'thé']
  ])('invalid: %s', (_label, id) => {
    expect(isValidThemeId(id)).toBe(false);
  });

  test('non-string values are invalid', () => {
    expect(isValidThemeId(123)).toBe(false);
    expect(isValidThemeId(null)).toBe(false);
    expect(isValidThemeId(undefined)).toBe(false);
  });

  test('assertValidThemeId returns the value when valid', () => {
    expect(assertValidThemeId('boutique')).toBe('boutique');
  });

  test('assertValidThemeId throws on invalid', () => {
    expect(() => assertValidThemeId('BAD')).toThrow(/invalid theme ID/);
  });
});

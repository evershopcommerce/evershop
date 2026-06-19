import { assertValidVersion, isValidVersion } from '../../version.js';

describe('version', () => {
  test.each(['1.0.0', '2.3.4', '0.0.1', '1.0.0-beta.1'])('valid: %s', (v) => {
    expect(isValidVersion(v)).toBe(true);
  });

  test.each([
    ['empty', ''],
    ['partial', '1.2'],
    ['single', '1'],
    ['text', 'abc'],
    ['four parts', '1.0.0.0']
  ])('invalid: %s', (_label, v) => {
    expect(isValidVersion(v)).toBe(false);
  });

  test('non-string values are invalid', () => {
    expect(isValidVersion(123)).toBe(false);
    expect(isValidVersion(null)).toBe(false);
    expect(isValidVersion(undefined)).toBe(false);
  });

  test('assertValidVersion returns the value when valid', () => {
    expect(assertValidVersion('1.2.3')).toBe('1.2.3');
  });

  test('assertValidVersion throws on invalid or missing', () => {
    expect(() => assertValidVersion('1.2')).toThrow(/SemVer/);
    expect(() => assertValidVersion(undefined)).toThrow(/SemVer/);
  });
});

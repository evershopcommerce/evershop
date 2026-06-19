import { canonicalize, canonicallyEqual } from '../../canonicalize.js';

describe('canonicalize', () => {
  test('empty object / array', () => {
    expect(canonicalize({})).toBe('{}');
    expect(canonicalize([])).toBe('[]');
  });

  test('object keys are sorted lexicographically', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
  });

  test('nested objects sort at every level', () => {
    expect(canonicalize({ z: { b: 1, a: 2 } })).toBe('{"z":{"a":2,"b":1}}');
  });

  test('arrays are NOT sorted — order is significant', () => {
    expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
    expect(canonicallyEqual([1, 2], [2, 1])).toBe(false);
  });

  test('number form: 100 stays 100, and 100 == 100.0', () => {
    expect(canonicalize(100)).toBe('100');
    expect(canonicallyEqual(100, 100.0)).toBe(true);
  });

  test('100 (number) is not equal to "100" (string)', () => {
    expect(canonicallyEqual(100, '100')).toBe(false);
  });

  test('true is not equal to 1', () => {
    expect(canonicallyEqual(true, 1)).toBe(false);
  });

  test('empty string is not equal to null', () => {
    expect(canonicallyEqual('', null)).toBe(false);
  });

  test('a null value differs from a missing key', () => {
    expect(canonicallyEqual({ a: null }, {})).toBe(false);
  });

  test('unicode strings pass through', () => {
    expect(canonicalize('café')).toBe('"café"');
  });
});

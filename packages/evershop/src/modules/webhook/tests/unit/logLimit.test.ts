import { jest, describe, it, expect } from '@jest/globals';

jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: jest.fn()
}));

const { clampLogLimit } = await import('../../services/logLimit.js');

describe('clampLogLimit', () => {
  it('keeps a value in range', () => {
    expect(clampLogLimit(100)).toBe(100);
    expect(clampLogLimit(10)).toBe(10);
    expect(clampLogLimit(1000)).toBe(1000);
  });

  it('clamps to 10..1000', () => {
    expect(clampLogLimit(1)).toBe(10);
    expect(clampLogLimit(-5)).toBe(10);
    expect(clampLogLimit(999999)).toBe(1000);
  });

  it('parses a numeric string (settings are stored as text)', () => {
    expect(clampLogLimit('250')).toBe(250);
    expect(clampLogLimit('3')).toBe(10);
  });

  it('truncates a fraction', () => {
    expect(clampLogLimit(50.9)).toBe(50);
  });

  it.each([[undefined], [null], ['abc'], [NaN], [{}]])(
    'falls back to 100 for %p',
    (value) => {
      expect(clampLogLimit(value)).toBe(100);
    }
  );
});

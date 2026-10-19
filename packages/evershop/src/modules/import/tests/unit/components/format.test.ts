import { describe, expect, it } from '@jest/globals';
import {
  formatBytes,
  formatDateTime,
  formatNumber
} from '../../../components/format.js';

describe('sizes as people say them', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1 KB'],
    [850 * 1024, '850 KB'],
    [1_048_576, '1 MB'],
    [Math.round(12.4 * 1_048_576), '12.4 MB'],
    [5 * 1_048_576, '5 MB'],
    [100 * 1_048_576, '100 MB'],
    [Math.round(99.96 * 1_048_576), '100 MB'],
    [1.5 * 1024 ** 3, '1.5 GB'],
    [3 * 1024 ** 4, '3072 GB']
  ])('%d bytes is %s', (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });
});

describe('numbers and dates', () => {
  it('groups the digits of a number', () => {
    expect(formatNumber(49310)).toMatch(/^49.?310$/);
  });

  it('gives -- for a date that is missing or not a date', () => {
    expect(formatDateTime(null)).toBe('--');
    expect(formatDateTime('not a date')).toBe('--');
  });

  it('writes a date and a time', () => {
    const text = formatDateTime('2026-10-13T15:02:00.000Z');
    expect(text).toMatch(/2026/);
    expect(text).toMatch(/\d{1,2}[:.]\d{2}/);
  });
});

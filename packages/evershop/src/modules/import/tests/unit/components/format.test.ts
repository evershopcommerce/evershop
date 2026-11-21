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

  describe('the time zone', () => {
    const iso = '2026-10-19T09:00:00.000Z';

    it('is the time zone of the store when it is given', () => {
      expect(formatDateTime(iso, 'UTC')).toContain('9:00');
      expect(formatDateTime(iso, 'Asia/Ho_Chi_Minh')).toContain('4:00');
      expect(formatDateTime(iso, 'America/New_York')).toContain('5:00');
    });

    it('can move the day', () => {
      expect(
        formatDateTime('2026-10-19T20:00:00.000Z', 'Asia/Ho_Chi_Minh')
      ).toContain('Oct 20');
      expect(formatDateTime('2026-10-19T20:00:00.000Z', 'UTC')).toContain(
        'Oct 19'
      );
    });

    it('is the browser’s when it is not given, empty, or not a time zone', () => {
      const browser = formatDateTime(iso);
      expect(formatDateTime(iso, null)).toBe(browser);
      expect(formatDateTime(iso, '')).toBe(browser);
      expect(formatDateTime(iso, 'Not/AZone')).toBe(browser);
    });
  });
});

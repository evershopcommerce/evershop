import { describe, it, expect } from '@jest/globals';
import { getPoolSettings } from '../../poolSettings.js';

describe('getPoolSettings', () => {
  it('keeps 20 connections and no wait limit when nothing is set', () => {
    expect(getPoolSettings({})).toEqual({ max: 20, connectionTimeoutMillis: 0 });
    expect(
      getPoolSettings({ DB_POOL_MAX: ' ', DB_POOL_TIMEOUT_MS: '' })
    ).toEqual({ max: 20, connectionTimeoutMillis: 0 });
  });

  it('reads both settings, with spaces around them', () => {
    expect(
      getPoolSettings({ DB_POOL_MAX: ' 5 ', DB_POOL_TIMEOUT_MS: '10000' })
    ).toEqual({ max: 5, connectionTimeoutMillis: 10000 });
  });

  it('accepts 0 as the wait (no limit) and 1 as the smallest pool', () => {
    expect(
      getPoolSettings({ DB_POOL_MAX: '1', DB_POOL_TIMEOUT_MS: '0' })
    ).toEqual({ max: 1, connectionTimeoutMillis: 0 });
  });

  it.each(['0', '-1', '2.5', 'five', '2147483648'])(
    'refuses DB_POOL_MAX="%s" and says which variable is wrong',
    (value) => {
      expect(() => getPoolSettings({ DB_POOL_MAX: value })).toThrow(
        `DB_POOL_MAX must be a whole number from 1 to 2147483647, got "${value}"`
      );
    }
  );

  it.each(['-1', '10s', '1.5', '2147483648'])(
    'refuses DB_POOL_TIMEOUT_MS="%s" and says which variable is wrong',
    (value) => {
      expect(() => getPoolSettings({ DB_POOL_TIMEOUT_MS: value })).toThrow(
        `DB_POOL_TIMEOUT_MS must be a whole number from 0 to 2147483647 (0 means no limit), got "${value}"`
      );
    }
  );
});

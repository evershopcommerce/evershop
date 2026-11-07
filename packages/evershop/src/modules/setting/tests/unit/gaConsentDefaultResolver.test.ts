import { describe, it, expect } from '@jest/globals';
import resolvers from '../../graphql/types/BrandingSetting/BrandingSetting.resolvers.js';

/**
 * `Setting.gaConsentDefault`: the admin's "Cookie consent" for GA4. A
 * stored 'denied', in any case or with spaces around it (saved through the
 * API or by SQL), is denied, as the storefront reads it, so the admin shows
 * "Required"; no row, an empty value or anything else is 'granted'.
 */
const rows = (value?: string) => (value === undefined ? [] : [{ name: 'gaConsentDefault', value }]);

describe('Setting.gaConsentDefault', () => {
  it.each([['denied'], ['DENIED'], [' Denied ']])('denied for %j', (value) => {
    expect(resolvers.Setting.gaConsentDefault(rows(value) as never)).toBe('denied');
  });

  it.each([[undefined], [''], ['granted'], ['something else']])('granted for %j', (value) => {
    expect(resolvers.Setting.gaConsentDefault(rows(value) as never)).toBe('granted');
  });
});

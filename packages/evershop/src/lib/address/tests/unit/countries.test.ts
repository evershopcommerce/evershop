import { describe, expect, it } from '@jest/globals';
import { getCountries, getCountryName, isKnownCountry } from '../../countries.js';

describe('lib/address country helpers', () => {
  it('getCountries returns a sorted copy', () => {
    const list = getCountries();
    expect(list.length).toBeGreaterThan(200);
    const names = list.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
    expect(list.some((c) => c.code === 'US' && c.name === 'United States')).toBe(true);

    list[0].name = 'MUTATED';
    expect(getCountries()[0].name).not.toBe('MUTATED');
    expect(getCountries('vi')).toEqual(getCountries()); // locale accepted, ignored in this release
  });

  it('getCountryName resolves known codes and falls back to the code', () => {
    expect(getCountryName('US')).toBe('United States');
    expect(getCountryName('us')).toBe('United States');
    expect(getCountryName('VN', 'vi')).toBe('Vietnam');
    expect(getCountryName('QZ')).toBe('QZ');
    expect(getCountryName('')).toBe('');
  });

  it('isKnownCountry', () => {
    expect(isKnownCountry('US')).toBe(true);
    expect(isKnownCountry('vn')).toBe(true);
    expect(isKnownCountry('QZ')).toBe(false);
    expect(isKnownCountry('')).toBe(false);
  });
});

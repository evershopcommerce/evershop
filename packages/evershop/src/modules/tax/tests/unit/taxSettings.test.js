import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// The `setting` table returns scalars as strings; the getters must coerce them. Mock the
// setting cache with a plain lookup table so we can feed raw strings (warm-cache shape) and
// real primitives (cold-cache config-fallback shape) and assert the coerced result.
const settingValues = {};
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (name, defaultValue) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue,
  getSettingSync: (name, defaultValue) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue
}));

const {
  getTaxRounding,
  getTaxPrecision,
  getTaxRoundLevel,
  getPriceIncludingTax
} = await import('../../services/taxSettings.js');

describe('tax settings getters', () => {
  beforeEach(() => {
    for (const key of Object.keys(settingValues)) {
      delete settingValues[key];
    }
  });

  it('coerces string DB values to the right runtime types', () => {
    settingValues.taxRounding = 'ceil';
    settingValues.taxPrecision = '3';
    settingValues.taxRoundLevel = 'line';
    settingValues.priceIncludingTax = 'true';
    expect(getTaxRounding()).toBe('ceil');
    expect(getTaxPrecision()).toBe(3);
    expect(getTaxRoundLevel()).toBe('line');
    expect(getPriceIncludingTax()).toBe(true);
  });

  it('reads "false"/"0" as false and "1"/"yes" as true', () => {
    settingValues.priceIncludingTax = 'false';
    expect(getPriceIncludingTax()).toBe(false);
    settingValues.priceIncludingTax = '0';
    expect(getPriceIncludingTax()).toBe(false);
    settingValues.priceIncludingTax = '1';
    expect(getPriceIncludingTax()).toBe(true);
    settingValues.priceIncludingTax = 'yes';
    expect(getPriceIncludingTax()).toBe(true);
  });

  it('passes real primitives through unchanged (cold-cache config-fallback shape)', () => {
    settingValues.priceIncludingTax = true;
    expect(getPriceIncludingTax()).toBe(true);
    settingValues.taxPrecision = 4;
    expect(getTaxPrecision()).toBe(4);
  });

  it('falls back to the default for an out-of-range enum value', () => {
    settingValues.taxRounding = 'bogus';
    settingValues.taxRoundLevel = 'nonsense';
    expect(getTaxRounding()).toBe('round');
    expect(getTaxRoundLevel()).toBe('unit');
  });

  it('returns the inline config defaults when no setting is present', () => {
    expect(getTaxRounding()).toBe('round');
    expect(getTaxPrecision()).toBe(2);
    expect(getTaxRoundLevel()).toBe('unit');
    expect(getPriceIncludingTax()).toBe(false);
  });
});

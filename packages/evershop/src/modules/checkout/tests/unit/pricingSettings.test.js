import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const settingValues = {};
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (name, defaultValue) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue,
  getSettingSync: (name, defaultValue) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue
}));

const { getPriceRounding, getPricePrecision } = await import(
  '../../services/pricingSettings.js'
);

describe('pricing settings getters', () => {
  beforeEach(() => {
    for (const key of Object.keys(settingValues)) {
      delete settingValues[key];
    }
  });

  it('coerces precision and validates the rounding mode', () => {
    settingValues.pricingRounding = 'ceil';
    settingValues.pricingPrecision = '3';
    expect(getPriceRounding()).toBe('ceil');
    expect(getPricePrecision()).toBe(3);
  });

  it('accepts round/ceil/floor and the legacy up/down aliases', () => {
    settingValues.pricingRounding = 'floor';
    expect(getPriceRounding()).toBe('floor');
    settingValues.pricingRounding = 'up';
    expect(getPriceRounding()).toBe('up');
    settingValues.pricingRounding = 'down';
    expect(getPriceRounding()).toBe('down');
  });

  it('falls back to `round` for an invalid rounding value', () => {
    settingValues.pricingRounding = 'bogus';
    expect(getPriceRounding()).toBe('round');
  });

  it('returns the defaults when no setting is present', () => {
    expect(getPriceRounding()).toBe('round');
    expect(getPricePrecision()).toBe(2);
  });
});

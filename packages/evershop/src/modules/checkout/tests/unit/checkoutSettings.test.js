import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const settingValues = {};
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (name, defaultValue) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue,
  getSettingSync: (name, defaultValue) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue
}));

const { getAllowGuestCheckout } = await import(
  '../../services/checkoutSettings.js'
);

describe('checkout settings getters', () => {
  beforeEach(() => {
    for (const key of Object.keys(settingValues)) {
      delete settingValues[key];
    }
  });

  it('defaults to true (guest checkout allowed) when no setting is present', () => {
    expect(getAllowGuestCheckout()).toBe(true);
  });

  it('coerces the stored string values to a boolean', () => {
    settingValues.allowGuestCheckout = 'false';
    expect(getAllowGuestCheckout()).toBe(false);
    settingValues.allowGuestCheckout = 'true';
    expect(getAllowGuestCheckout()).toBe(true);
    settingValues.allowGuestCheckout = '0';
    expect(getAllowGuestCheckout()).toBe(false);
    settingValues.allowGuestCheckout = '1';
    expect(getAllowGuestCheckout()).toBe(true);
  });

  it('passes a real boolean through (cold-cache config-fallback shape)', () => {
    settingValues.allowGuestCheckout = false;
    expect(getAllowGuestCheckout()).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

/** The eight flat `setting` rows → `AddressSettings` (spec § 3.13, D-01). */
const settingValues: Record<string, unknown> = {};
jest.unstable_mockModule('../../../setting/services/setting.js', () => ({
  getSetting: async (name: string, defaultValue: unknown) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue,
  getSettingSync: (name: string, defaultValue: unknown) =>
    settingValues[name] !== undefined ? settingValues[name] : defaultValue,
  getStoreLanguageSync: () => 'en'
}));

const { getAddressSettings, ADDRESS_SETTING_ROWS } = await import(
  '../../services/address/getAddressSettings.js'
);
const { ADDRESS_SETTINGS_DEFAULTS, resolveDefaultCountry } = await import(
  '../../../../lib/address/settings.js'
);

describe('getAddressSettings', () => {
  let warn: ReturnType<typeof jest.spyOn>;
  beforeEach(() => {
    for (const key of Object.keys(settingValues)) delete settingValues[key];
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it('returns the code defaults when no row exists, silently', () => {
    expect(getAddressSettings()).toEqual(ADDRESS_SETTINGS_DEFAULTS);
    expect(warn).not.toHaveBeenCalled();
  });

  it('reads the flat rows named address + PascalCase(key)', () => {
    settingValues[ADDRESS_SETTING_ROWS.nameFormat] = 'split';
    settingValues[ADDRESS_SETTING_ROWS.telephone] = 'optional';
    settingValues[ADDRESS_SETTING_ROWS.organization] = 'required';
    settingValues[ADDRESS_SETTING_ROWS.addressLine2] = 'hidden';
    settingValues[ADDRESS_SETTING_ROWS.addressLine3] = 'enabled';
    settingValues[ADDRESS_SETTING_ROWS.defaultCountry] = 'vn';
    expect(getAddressSettings()).toMatchObject({
      nameFormat: 'split',
      telephone: 'optional',
      organization: 'required',
      addressLine2: 'hidden',
      addressLine3: 'enabled',
      defaultCountry: 'VN'
    });
  });

  it('takes the JSON rows parsed (is_json) or as a JSON string, and a plain "all"', () => {
    settingValues[ADDRESS_SETTING_ROWS.required] = { postal_code: 'required' };
    settingValues[ADDRESS_SETTING_ROWS.sellToCountries] = '["us", "DE"]';
    expect(getAddressSettings()).toMatchObject({
      required: { postal_code: 'required' },
      sellToCountries: ['US', 'DE']
    });
    settingValues[ADDRESS_SETTING_ROWS.sellToCountries] = 'all';
    expect(getAddressSettings().sellToCountries).toBe('all');
    settingValues[ADDRESS_SETTING_ROWS.required] = '{"locality":"required"}';
    expect(getAddressSettings().required).toEqual({ locality: 'required' });
  });

  it('falls back to the default with a warning on an unknown stored value', () => {
    settingValues[ADDRESS_SETTING_ROWS.telephone] = 'maybe';
    expect(getAddressSettings().telephone).toBe('required');
    expect(warn).toHaveBeenCalled();
  });

  it('defaultCountry modes resolve through the library: store, none, a code', () => {
    settingValues[ADDRESS_SETTING_ROWS.defaultCountry] = 'store';
    expect(resolveDefaultCountry(getAddressSettings(), 'VN')).toBe('VN');
    settingValues[ADDRESS_SETTING_ROWS.defaultCountry] = 'none';
    expect(resolveDefaultCountry(getAddressSettings(), 'VN')).toBe('');
    settingValues[ADDRESS_SETTING_ROWS.defaultCountry] = 'DE';
    expect(resolveDefaultCountry(getAddressSettings(), 'VN')).toBe('DE');
  });
});

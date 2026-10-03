import {
  ADDRESS_SETTINGS_DEFAULTS,
  normalizeAddressSettings
} from '../../../../lib/address/settings.js';
import type { AddressSettings } from '../../../../lib/address/types.js';
import { getSettingSync } from '../../../setting/services/setting.js';

/**
 * The eight merchant address settings (spec § 3.13), read synchronously from
 * the setting cache warmed at boot. Each key is one flat `setting` row named
 * `address` + PascalCase(key); there are no `address.*` config keys. Absent
 * rows take the code default (`ADDRESS_SETTINGS_DEFAULTS`); an unknown stored
 * value falls back to the default with a warning (`normalizeAddressSettings`).
 *
 * `addressRequired` and `addressSellToCountries` are JSON rows. `saveSetting`
 * stores them with `is_json`, which `getSettingSync` parses; a row written
 * without the flag arrives as a string and is parsed here, and a plain
 * `"all"` stays the string `'all'`.
 */

export const ADDRESS_SETTING_ROWS = {
  nameFormat: 'addressNameFormat',
  telephone: 'addressTelephone',
  organization: 'addressOrganization',
  addressLine2: 'addressLine2',
  addressLine3: 'addressLine3',
  required: 'addressRequired',
  defaultCountry: 'addressDefaultCountry',
  sellToCountries: 'addressSellToCountries'
} as const satisfies Record<keyof AddressSettings, string>;

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

export function getAddressSettings(): AddressSettings {
  return normalizeAddressSettings({
    nameFormat: getSettingSync<unknown>(ADDRESS_SETTING_ROWS.nameFormat, undefined),
    telephone: getSettingSync<unknown>(ADDRESS_SETTING_ROWS.telephone, undefined),
    organization: getSettingSync<unknown>(ADDRESS_SETTING_ROWS.organization, undefined),
    addressLine2: getSettingSync<unknown>(ADDRESS_SETTING_ROWS.addressLine2, undefined),
    addressLine3: getSettingSync<unknown>(ADDRESS_SETTING_ROWS.addressLine3, undefined),
    required: parseJsonValue(getSettingSync<unknown>(ADDRESS_SETTING_ROWS.required, undefined)),
    defaultCountry: getSettingSync<unknown>(ADDRESS_SETTING_ROWS.defaultCountry, undefined),
    sellToCountries: parseJsonValue(
      getSettingSync<unknown>(ADDRESS_SETTING_ROWS.sellToCountries, undefined)
    )
  });
}

export { ADDRESS_SETTINGS_DEFAULTS };

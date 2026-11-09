import { isKnownCountry } from '../../../lib/address/countries.js';
import { getAddressExtras } from '../../../lib/address/extras.js';
import { getAddressRuntime } from '../../../lib/address/runtime.js';
import { ADDRESS_SETTINGS_DEFAULTS } from '../../../lib/address/settings.js';
import type { AddressRow } from '../../../lib/address/types.js';
import { validateAddress } from '../../../lib/address/validate.js';
import type { AddressRules } from '../services/ports/lookup.js';

/**
 * The address rules of the store (§ 5.5) from core's own library: the countries
 * the registry knows, the extras registered for a country, and `validateAddress`
 * for the account surface. Only the seam differs between the real store, which
 * runs the processors of `customerAddressDataBeforeCreate`, and the test double,
 * which runs the store's normalizer directly; `extraIds` can be given for a
 * double that has registered nothing.
 */
export function createAddressRules(options: {
  normalize: (
    address: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
  extraIds?: (country: string) => readonly string[];
  /** For a double: the countries the store sells to (the real store has its setting). */
  sellToCountries?: 'all' | string[];
  /** For a double: the name format (the real store has its setting). */
  nameFormat?: () => 'single' | 'split';
}): AddressRules {
  const settings =
    options.sellToCountries === undefined
      ? undefined
      : {
          ...ADDRESS_SETTINGS_DEFAULTS,
          sellToCountries: options.sellToCountries
        };
  return {
    nameFormat:
      options.nameFormat ??
      (() => getAddressRuntime().getSettings().nameFormat),
    isKnownCountry: (code) => isKnownCountry(code),
    extraIds:
      options.extraIds ??
      ((country) => getAddressExtras(country).map((def) => def.id)),
    normalize: options.normalize,
    async check(address) {
      const result = await validateAddress(address as AddressRow, {
        surface: 'account',
        ...(settings ? { settings } : {})
      });
      return result.errors.map((error) => ({
        field: error.field,
        code: error.code,
        message: error.message
      }));
    }
  };
}

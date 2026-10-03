import { getCountryName } from '../../../lib/address/countries.js';
import { formatAddressRow } from '../../../lib/address/display.js';
import type { Address } from '../../../types/address.js';
import { regionForRow } from '../../base/services/address/graphqlAddress.js';

/**
 * The email data contract for an address (spec § 3.6): the row under the new
 * column names plus `formatted` (display lines, the default template prints
 * these) and the derived names a custom template may want. `province_name` is
 * gone with the rename.
 */
export interface EmailAddressData extends Address {
  formatted: string[];
  country_name: string;
  administrative_area_name: string | null;
  locality_name: string | null;
  dependent_locality_name: string | null;
}

export async function decorateAddressForEmail(
  row: Address,
  locale: string
): Promise<EmailAddressData> {
  const country = String(row.country ?? '')
    .trim()
    .toUpperCase();
  const [formatted, area, locality, dependent] = await Promise.all([
    formatAddressRow(row, locale),
    regionForRow(row, 'administrative_area', locale),
    regionForRow(row, 'locality', locale),
    regionForRow(row, 'dependent_locality', locale)
  ]);
  return {
    ...row,
    formatted,
    country_name: country === '' ? '' : getCountryName(country, locale),
    administrative_area_name: area?.name ?? null,
    locality_name: locality?.name ?? null,
    dependent_locality_name: dependent?.name ?? null
  };
}

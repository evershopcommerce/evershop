import { select } from '@evershop/postgres-query-builder';
import { getCountries } from '../../../../lib/address/countries.js';
import { resolveSellToCountries } from '../../../../lib/address/settings.js';
import type { Country } from '../../../../lib/address/types.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getAddressSettings } from './getAddressSettings.js';

/**
 * Country lists per scope (spec § 3.7, § 3.13 — "intent wins, logistics is
 * flagged"):
 *   ALL      every known country (the store's own address picker);
 *   SELL_TO  the merchant's `sellToCountries` list, or every country for `all`
 *            (address book, billing);
 *   SHIPPING SELL_TO ∩ the countries covered by at least one shipping zone
 *            (the checkout shipping address).
 * Zone countries live in `shipping_zone_country` (one row per zone/country).
 */
export type CountryScope = 'ALL' | 'SELL_TO' | 'SHIPPING';

/** Distinct ISO codes covered by at least one shipping zone. */
export async function getZoneCountries(): Promise<string[]> {
  const rows = (await select('country')
    .from('shipping_zone_country')
    .execute(pool)) as Array<{ country: string }>;
  const codes = new Set<string>();
  for (const row of rows) {
    if (typeof row.country === 'string' && row.country.trim() !== '') {
      codes.add(row.country.trim().toUpperCase());
    }
  }
  return [...codes];
}

export async function getCountriesForScope(
  scope: CountryScope = 'ALL',
  locale?: string
): Promise<Country[]> {
  const all = getCountries(locale);
  if (scope === 'ALL') {
    return all;
  }
  const zoneCountries = scope === 'SHIPPING' ? await getZoneCountries() : undefined;
  const allowed = new Set(
    resolveSellToCountries(
      getAddressSettings(),
      scope,
      all.map((c) => c.code),
      zoneCountries
    )
  );
  return all.filter((c) => allowed.has(c.code));
}

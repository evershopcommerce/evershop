import { select } from '@evershop/postgres-query-builder';
import {
  getRegionProvider,
  resolveRegionName
} from '../../../../lib/address/regions.js';
import type { Region } from '../../../../lib/address/types.js';
import { pool } from '../../../../lib/postgres/connection.js';
import { getSettingSync } from '../../../setting/services/setting.js';
import { getAddressSettings } from './getAddressSettings.js';

/**
 * Stale references in merchant data (spec § 3.3, § 3.13, D-21). Nothing stored
 * is ever rewritten; the admin reads this list to show the "retired" and
 * "not sold to" markers and the stranded-zone confirmation.
 *
 * - `retired_region`: a region key stored on a shipping zone, a tax rate or
 *   the store address that is no longer an active key at its level — retired
 *   by a data refresh (with `mergedInto` naming the successor when the data
 *   knows it) or unknown to the country's provider. Free-text levels are not
 *   checked. Tax-rate values are comma-separated lists with a `*` wildcard.
 * - `country_not_sold_to`: a shipping-zone country outside the merchant's
 *   `sellToCountries` list (never flagged for `all`).
 */
export type AddressConfigWarningKind = 'retired_region' | 'country_not_sold_to';

export interface AddressConfigWarning {
  kind: AddressConfigWarningKind;
  source: 'shipping_zone' | 'tax_rate' | 'store_address';
  sourceId: string;
  sourceName: string | null;
  country: string;
  level: string | null;
  key: string | null;
  keyName: string | null;
  mergedInto: { key: string; name: string; isoCode: string | null } | null;
}

interface RegionStatus {
  enumerated: boolean;
  region?: Region;
}

/** Status of `key` at the top (`administrative_area`) level of `country`. */
async function regionStatus(
  country: string,
  key: string,
  locale?: string
): Promise<RegionStatus> {
  const provider = getRegionProvider(country);
  if (!provider.levels.includes('administrative_area')) {
    return { enumerated: false };
  }
  const regions = await provider.list([], locale);
  return { enumerated: true, region: regions.find((r) => r.key === key) };
}

async function retiredRegionWarning(
  source: AddressConfigWarning['source'],
  sourceId: string,
  sourceName: string | null,
  country: string,
  key: string,
  locale?: string
): Promise<AddressConfigWarning | null> {
  const cc = country.trim().toUpperCase();
  const status = await regionStatus(cc, key, locale);
  if (!status.enumerated || (status.region && !status.region.retired)) {
    return null;
  }
  const successorKey = status.region?.mergedInto ?? null;
  const successor =
    successorKey !== null
      ? (await getRegionProvider(cc).list([], locale)).find(
          (r) => r.key === successorKey
        )
      : undefined;
  return {
    kind: 'retired_region',
    source,
    sourceId,
    sourceName,
    country: cc,
    level: 'administrative_area',
    key,
    keyName: await resolveRegionName(cc, 'administrative_area', key, locale),
    mergedInto:
      successorKey !== null
        ? {
            key: successorKey,
            name: await resolveRegionName(cc, 'administrative_area', successorKey, locale),
            isoCode: successor?.isoCode ?? null
          }
        : null
  };
}

function splitList(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '' && item !== '*');
}

export async function getAddressConfigWarnings(
  locale?: string
): Promise<AddressConfigWarning[]> {
  const warnings: AddressConfigWarning[] = [];

  // Shipping zones: region restrictions.
  const regionQuery = select().from('shipping_zone_region');
  regionQuery.select('shipping_zone_region.country', 'country');
  regionQuery.select('shipping_zone_region.level', 'level');
  regionQuery.select('shipping_zone_region.region_key', 'region_key');
  regionQuery.select('shipping_zone.uuid', 'zone_uuid');
  regionQuery.select('shipping_zone.name', 'zone_name');
  regionQuery
    .innerJoin('shipping_zone')
    .on('shipping_zone.shipping_zone_id', '=', 'shipping_zone_region.zone_id');
  const regionRows = (await regionQuery.execute(pool)) as Array<{
    country: string;
    level: string;
    region_key: string;
    zone_uuid: string;
    zone_name: string;
  }>;
  for (const row of regionRows) {
    if (row.level !== 'administrative_area') {
      continue;
    }
    const warning = await retiredRegionWarning(
      'shipping_zone',
      row.zone_uuid,
      row.zone_name,
      row.country,
      row.region_key,
      locale
    );
    if (warning) {
      warnings.push(warning);
    }
  }

  // Tax rates: comma-separated keys, `*` wildcard; only single-country rates can be checked.
  const taxRows = (await select().from('tax_rate').execute(pool)) as Array<{
    uuid: string;
    name: string;
    country: string;
    administrative_area: string;
  }>;
  for (const rate of taxRows) {
    const countries = splitList(rate.country);
    if (countries.length !== 1) {
      continue;
    }
    for (const key of splitList(rate.administrative_area)) {
      const warning = await retiredRegionWarning(
        'tax_rate',
        rate.uuid,
        rate.name,
        countries[0],
        key,
        locale
      );
      if (warning) {
        warnings.push(warning);
      }
    }
  }

  // The store's own address (origin for shipping quotes and store-based tax).
  const storeCountry = getSettingSync<string>('storeCountry', '');
  const storeProvince = getSettingSync<string>('storeProvince', '');
  if (storeCountry && storeProvince) {
    const warning = await retiredRegionWarning(
      'store_address',
      'storeProvince',
      null,
      storeCountry,
      storeProvince,
      locale
    );
    if (warning) {
      warnings.push(warning);
    }
  }

  // Zone countries outside the sell-to list.
  const { sellToCountries } = getAddressSettings();
  if (sellToCountries !== 'all') {
    const allowed = new Set(sellToCountries.map((c) => c.toUpperCase()));
    const countryQuery = select().from('shipping_zone_country');
    countryQuery.select('shipping_zone_country.country', 'country');
    countryQuery.select('shipping_zone.uuid', 'zone_uuid');
    countryQuery.select('shipping_zone.name', 'zone_name');
    countryQuery
      .innerJoin('shipping_zone')
      .on('shipping_zone.shipping_zone_id', '=', 'shipping_zone_country.zone_id');
    const countryRows = (await countryQuery.execute(pool)) as Array<{
      country: string;
      zone_uuid: string;
      zone_name: string;
    }>;
    for (const row of countryRows) {
      const cc = String(row.country ?? '').trim().toUpperCase();
      if (cc === '' || allowed.has(cc)) {
        continue;
      }
      warnings.push({
        kind: 'country_not_sold_to',
        source: 'shipping_zone',
        sourceId: row.zone_uuid,
        sourceName: row.zone_name,
        country: cc,
        level: null,
        key: null,
        keyName: null,
        mergedInto: null
      });
    }
  }

  return warnings;
}

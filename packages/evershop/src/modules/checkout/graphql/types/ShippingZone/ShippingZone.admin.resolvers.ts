import { select } from '@evershop/postgres-query-builder';
import { getCountryName } from '../../../../../lib/address/countries.js';
import {
  getRegionProvider,
  regionDisplayName
} from '../../../../../lib/address/regions.js';
import type { Region } from '../../../../../lib/address/types.js';
import { getActiveLocale } from '../../../../../lib/locale/localeContext.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getShippingProvider } from '../../../services/shipping/registry.js';

interface ShippingZoneRowCamel {
  shippingZoneId: number;
  uuid: string;
  name: string;
}

interface CountryGraphql {
  code: string;
  name: string;
}

interface ZoneRegionRow {
  country: string;
  level: string;
  region_key: string;
}

interface ZoneRegionGraphql {
  country: string;
  level: string;
  key: string;
  name: string;
  retired: boolean;
  mergedInto: { key: string; name: string; isoCode: string | null } | null;
}

/**
 * Name, retired flag and successor for a zone's stored key. Only the top level
 * (`administrative_area`) is enumerated by the default data; a key at a level
 * the provider does not list, or an unknown key, keeps the key as its name.
 */
async function describeZoneRegion(
  row: ZoneRegionRow,
  locale: string
): Promise<ZoneRegionGraphql> {
  const provider = getRegionProvider(row.country);
  let list: Region[] = [];
  if (provider.levels[0] === row.level) {
    list = await provider.list([], locale);
  }
  const match = list.find((r) => r.key === row.region_key);
  const successor = match?.mergedInto
    ? list.find((r) => r.key === match.mergedInto)
    : undefined;
  return {
    country: row.country,
    level: row.level,
    key: row.region_key,
    name: match ? regionDisplayName(match, row.country, locale) : row.region_key,
    retired: Boolean(match?.retired),
    mergedInto: match?.mergedInto
      ? {
          key: match.mergedInto,
          name: successor
            ? regionDisplayName(successor, row.country, locale)
            : match.mergedInto,
          isoCode: successor?.isoCode ?? null
        }
      : null
  };
}

interface ShippingZoneProviderRowProjection {
  shipping_zone_provider_id: number;
  uuid: string;
  zone_id: number;
  provider_code: string;
  is_enabled: boolean;
  config: Record<string, unknown> | null;
  sort_order: number;
}

export default {
  Query: {
    shippingZones: async (): Promise<ShippingZoneRowCamel[]> => {
      const shippingZones = await select()
        .from('shipping_zone')
        .orderBy('shipping_zone_id', 'DESC')
        .execute(pool);
      return shippingZones.map(
        (row) => camelCase(row) as ShippingZoneRowCamel
      );
    },
    shippingZone: async (
      _: unknown,
      { id }: { id: string }
    ): Promise<ShippingZoneRowCamel | null> => {
      const shippingZone = await select()
        .from('shipping_zone')
        .where('uuid', '=', id)
        .load(pool);
      return shippingZone ? (camelCase(shippingZone) as ShippingZoneRowCamel) : null;
    }
  },
  ShippingZone: {
    shippingZoneId: ({ shippingZoneId }: ShippingZoneRowCamel): number =>
      shippingZoneId,
    countries: async ({
      shippingZoneId
    }: ShippingZoneRowCamel): Promise<CountryGraphql[]> => {
      const rows = (await select('country')
        .from('shipping_zone_country')
        .where('zone_id', '=', shippingZoneId)
        .execute(pool)) as Array<{ country: string }>;
      const locale = getActiveLocale();
      return rows.map((r) => ({
        code: r.country,
        name: getCountryName(r.country, locale)
      }));
    },
    regions: async ({
      shippingZoneId
    }: ShippingZoneRowCamel): Promise<ZoneRegionGraphql[]> => {
      const rows = (await select('country', 'level', 'region_key')
        .from('shipping_zone_region')
        .where('zone_id', '=', shippingZoneId)
        .execute(pool)) as ZoneRegionRow[];
      const locale = getActiveLocale();
      return Promise.all(rows.map((row) => describeZoneRegion(row, locale)));
    },
    providers: async ({ shippingZoneId }: ShippingZoneRowCamel) => {
      // Read attachments straight off `shipping_zone_provider`; `provider_code`
      // is on the row itself (soft ref into the registry), so no join.
      // Filter out attachments whose provider isn't currently registered —
      // those rows are inert orphans and shouldn't show up in the zone admin
      // UI. `.orderBy()` lives on the query handle, not on the where clause
      // (see wiki/database.md → "What chains on what").
      const query = select().from('shipping_zone_provider');
      query.where('zone_id', '=', shippingZoneId);
      query.orderBy('sort_order', 'ASC');
      const rows = (await query.execute(pool)) as ShippingZoneProviderRowProjection[];

      const filtered: Record<string, unknown>[] = [];
      for (const row of rows) {
        const registered = await getShippingProvider(row.provider_code);
        if (!registered) continue;
        filtered.push(camelCase(row));
      }
      return filtered;
    },
    updateApi: ({ uuid }: { uuid: string }): string =>
      buildUrl('updateShippingZone', { id: uuid }),
    deleteApi: ({ uuid }: { uuid: string }): string =>
      buildUrl('deleteShippingZone', { id: uuid })
  },
  // Used by CoreShippingMethodRate.priceBasedCost / weightBasedCost — JSONB
  // arrays in snake_case need camelCase resolvers at the field level.
  WeightBasedCostItem: {
    minWeight: ({ min_weight }: { min_weight: number | string }) => min_weight
  },
  PriceBasedCostItem: {
    minPrice: ({ min_price }: { min_price: number | string }) => min_price
  }
};

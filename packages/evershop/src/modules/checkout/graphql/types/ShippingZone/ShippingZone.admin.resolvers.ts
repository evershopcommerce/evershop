import { select } from '@evershop/postgres-query-builder';
import { countries } from '../../../../../lib/locale/countries.js';
import { provinces as provinceLocales } from '../../../../../lib/locale/provinces.js';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getShippingProvider } from '../../../services/shipping/registry.js';

interface ShippingZoneRowCamel {
  shippingZoneId: number;
  uuid: string;
  name: string;
}

interface CountryLocale {
  code: string;
  name: string;
}

interface ProvinceLocale {
  code: string;
  name: string;
  countryCode: string;
}

interface ShippingZoneProvinceRow {
  country: string;
  province: string;
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
    }: ShippingZoneRowCamel): Promise<CountryLocale[]> => {
      const rows = (await select('country')
        .from('shipping_zone_country')
        .where('zone_id', '=', shippingZoneId)
        .execute(pool)) as Array<{ country: string }>;
      return rows
        .map((r) => countries.find((c: CountryLocale) => c.code === r.country))
        .filter((c): c is CountryLocale => Boolean(c));
    },
    provinces: async ({
      shippingZoneId
    }: ShippingZoneRowCamel): Promise<ProvinceLocale[]> => {
      const rows = (await select('country', 'province')
        .from('shipping_zone_province')
        .where('zone_id', '=', shippingZoneId)
        .execute(pool)) as ShippingZoneProvinceRow[];
      return rows.map((r) => {
        const p = provinceLocales.find(
          (loc: ProvinceLocale) =>
            loc.code === r.province && loc.countryCode === r.country
        );
        return (
          p ?? { code: r.province, name: r.province, countryCode: r.country }
        );
      });
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

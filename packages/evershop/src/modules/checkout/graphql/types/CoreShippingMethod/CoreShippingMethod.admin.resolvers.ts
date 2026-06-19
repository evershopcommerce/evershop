import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import type {
  CoreShippingMethodRateRow,
  CoreShippingMethodRow,
  ShippingZoneRow
} from '../../../../../types/db/index.js';

/**
 * Admin GraphQL resolvers for Core's method storage.
 *
 * Queries return all methods regardless of `is_enabled` so admin can see
 * disabled rows and toggle them. Per-zone rates are loaded lazily via the
 * `rates` sub-resolver.
 */

export default {
  Query: {
    coreShippingMethods: async () => {
      const rows = (await select()
        .from('core_shipping_method')
        .orderBy('sort_order', 'ASC')
        .orderBy('core_shipping_method_id', 'ASC')
        .execute(pool)) as CoreShippingMethodRow[];
      return rows.map((row) => camelCase(row));
    },
    coreShippingMethod: async (_: unknown, { uuid }: { uuid: string }) => {
      const row = (await select()
        .from('core_shipping_method')
        .where('uuid', '=', uuid)
        .load(pool)) as CoreShippingMethodRow | undefined;
      return row ? camelCase(row) : null;
    }
  },
  CoreShippingMethod: {
    rates: async (parent: { coreShippingMethodId: number }) => {
      const rows = (await select()
        .from('core_shipping_method_rate')
        .where('method_id', '=', parent.coreShippingMethodId)
        .execute(pool)) as CoreShippingMethodRateRow[];
      return rows.map((row) => camelCase(row));
    },
    // Bare create endpoint — the method and zone go in the POST body, so the
    // URL takes no params. Same for every method; resolved server-side so the
    // admin UI never hardcodes the route path.
    addRateApi: (): string => buildUrl('createCoreShippingRate')
  },
  CoreShippingMethodRate: {
    updateApi: (parent: { uuid: string }): string =>
      buildUrl('updateCoreShippingRate', { uuid: parent.uuid }),
    deleteApi: (parent: { uuid: string }): string =>
      buildUrl('deleteCoreShippingRate', { uuid: parent.uuid }),
    zone: async (parent: { zoneId: number }) => {
      const row = (await select()
        .from('shipping_zone')
        .where('shipping_zone_id', '=', parent.zoneId)
        .load(pool)) as ShippingZoneRow | undefined;
      return row ? camelCase(row) : null;
    }
  }
};

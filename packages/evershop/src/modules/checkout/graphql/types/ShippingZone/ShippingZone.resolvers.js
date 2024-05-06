const { select } = require('@evershop/postgres-query-builder');
const { contries } = require('@evershop/evershop/src/lib/locale/countries');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');

module.exports = {
  Query: {
    shippingZones: async () => {
      const shippingZones = await select()
        .from('shipping_zone')
        .orderBy('shipping_zone_id', 'DESC')
        .execute(pool);
      // Parse the provinces field into an array
      return shippingZones.map((row) => camelCase(row));
    },
    shippingZone: async (_, { id }) => {
      const shippingZone = await select()
        .from('shipping_zone')
        .where('uuid', '=', id)
        .load(pool);
      return camelCase(shippingZone);
    }
  },
  ShippingZone: {
    methods: async (parent) => {
      const query = select().from('shipping_zone_method');
      query
        .innerJoin('shipping_method')
        .on(
          'shipping_method.shipping_method_id',
          '=',
          'shipping_zone_method.method_id'
        );

      query.where('zone_id', '=', parent.shippingZoneId);
      const methods = await query.execute(pool);
      return methods.map((row) => camelCase(row));
    },
    country: ({ country }) => {
      if (!country) {
        return null;
      } else {
        const c = contries.find((p) => p.code === country);
        if (c) {
          return c;
        } else {
          return null;
        }
      }
    },
    provinces: async ({ shippingZoneId }) => {
      const provinces = await select('province')
        .from('shipping_zone_province')
        .where('zone_id', '=', shippingZoneId)
        .execute(pool);
      return provinces.map((row) => row.province);
    },
    updateApi: ({ uuid }) => buildUrl('updateShippingZone', { id: uuid }),
    deleteApi: ({ uuid }) => buildUrl('deleteShippingZone', { id: uuid }),
    addMethodApi: ({ uuid }) => buildUrl('addShippingZoneMethod', { id: uuid }),
    removeMethodApi: ({ uuid }) =>
      buildUrl('removeShippingZoneMethod', { id: uuid })
  },
  ShippingMethodByZone: {
    updateApi: async ({ uuid, zoneId }) => {
      const zone = await select()
        .from('shipping_zone')
        .where('shipping_zone_id', '=', zoneId)
        .load(pool);

      return buildUrl('updateShippingZoneMethod', {
        zone_id: zone.uuid,
        method_id: uuid
      });
    },
    deleteApi: async ({ uuid, zoneId }) => {
      const zone = await select()
        .from('shipping_zone')
        .where('shipping_zone_id', '=', zoneId)
        .load(pool);

      return buildUrl('deleteShippingZoneMethod', {
        zone_id: zone.uuid,
        method_id: uuid
      });
    }
  },
  WeightBasedCostItem: {
    minWeight: ({ min_weight }) => min_weight
  },
  PriceBasedCostItem: {
    minPrice: ({ min_price }) => min_price
  }
};

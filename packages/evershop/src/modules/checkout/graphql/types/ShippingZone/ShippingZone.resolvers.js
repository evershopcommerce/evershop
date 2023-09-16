const { select } = require('@evershop/postgres-query-builder');
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
    provinces: async ({ shippingZoneId }) => {
      const provinces = await select('province')
        .from('shipping_zone_province')
        .where('zone_id', '=', shippingZoneId)
        .execute(pool);
      return provinces.map((row) => row.province);
    },
    updateApi: async ({ uuid }) => buildUrl('updateShippingZone', { id: uuid }),
    addMethodApi: async ({ uuid }) =>
      buildUrl('addShippingZoneMethod', { id: uuid }),
    removeMethodApi: async ({ uuid }) =>
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
    }
  }
};

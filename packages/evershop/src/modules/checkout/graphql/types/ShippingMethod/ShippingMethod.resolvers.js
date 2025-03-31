import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/src/lib/postgres/connection.js';
import { camelCase } from '@evershop/evershop/src/lib/util/camelCase.js';
import { buildUrl } from '@evershop/evershop/src/lib/router/buildUrl.js';

export default {
  Query: {
    shippingMethods: async () => {
      const shippingMethods = await select()
        .from('shipping_method')
        .orderBy('shipping_method_id', 'DESC')
        .execute(pool);
      return shippingMethods.map((row) => camelCase(row));
    }
  },
  ShippingMethod: {
    updateApi: ({ uuid }) => buildUrl('updateShippingMethod', { id: uuid })
  }
};

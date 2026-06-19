import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';

export default {
  Product: {
    package: async (product: Record<string, unknown>) => {
      // Product roots vary between camelCased rows and raw rows depending on
      // the query path — read both.
      const packageId = product.packageId ?? product.package_id;
      if (!packageId) {
        return null;
      }
      const row = await select()
        .from('package')
        .where('package_id', '=', packageId)
        .load(pool);
      return row ? camelCase(row) : null;
    }
  }
};

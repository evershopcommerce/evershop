import { sql } from '@evershop/postgres-query-builder';
import { pool } from '../../../../../lib/postgres/connection.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getProductsBaseQuery } from '../../../../../modules/catalog/services/getProductsBaseQuery.js';

export default {
  Query: {
    bestSellers: async () => {
      const query = getProductsBaseQuery();
      query
        .leftJoin('order_item')
        .on('product.product_id', '=', 'order_item.product_id');

      query
        .select(sql('"product".*'))
        .select(sql('"product_description".*'))
        .select(sql('"product_inventory".*'))
        .select(sql('"product_image".*'))
        .select('SUM(order_item.qty)', 'soldQty')
        .select('SUM(order_item.product_id)', 'sum')
        .where('order_item_id', 'IS NOT NULL', null);
      query
        .groupBy(
          'order_item.product_id',
          'product.product_id',
          'product_description.product_description_id',
          'product_inventory.product_inventory_id',
          'product_image.product_image_id'
        )
        .orderBy('soldQty', 'DESC')
        .limit(0, 5);
      const results = await query.execute(pool);
      return results.map((p) => camelCase(p));
    }
  }
};

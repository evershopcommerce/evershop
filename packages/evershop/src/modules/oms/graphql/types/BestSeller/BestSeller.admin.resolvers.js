const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const {
  getProductsBaseQuery
} = require('@evershop/evershop/src/modules/catalog/services/getProductsBaseQuery');
const { sql } = require('@evershop/postgres-query-builder');

module.exports = {
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

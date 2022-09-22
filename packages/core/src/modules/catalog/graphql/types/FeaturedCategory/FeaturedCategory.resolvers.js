const { select } = require('@evershop/mysql-query-builder');
const { camelCase } = require('../../../../../lib/util/camelCase');

module.exports = {
  Query: {
    featuredProducts: async (_, { }, { pool }) => {
      const query = select('product.`product_id`')
        .select('product.`sku`')
        .select('product.`price`')
        .select('product_description.`name`')
        .select('product_description.`url_key`')
        .select('product.`image`')
        .select('SUM(cart_item.`qty`)', 'soldQty')
        .from('product');
      query.leftJoin('product_description')
        .on('product.`product_id`', '=', 'product_description.`product_description_product_id`');
      query.leftJoin('cart_item')
        .on('cart_item.`product_id`', '=', 'product.`product_id`');
      query.where('product.`status`', '=', 1);
      query.groupBy('product.`product_id`');
      query.orderBy('soldQty', 'desc');
      query.limit(0, 4);

      const products = await query.execute(pool);
      return products.map((product) => camelCase(product));
    }
  }
}
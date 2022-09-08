const { select } = require('@evershop/mysql-query-builder');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { camelCase } = require('../../../../../lib/util/camelCase');

module.exports = {
  Product: {
    categories: async (product, _, { pool }) => {
      return await select()
        .from('category')
        .where(
          'category_id',
          'IN',
          await select('category_id')
            .from('product_category')
            .where('product_id', product.productId)
            .execute(pool)
        )
        .execute(pool);
    },
    url: (product, _, { pool }) => {
      return buildUrl('productView', { url_key: product.urlKey });
    }
  },
  Query: {
    product: async (_, { id }, { pool }) => {
      const result = await select()
        .from('product')
        .leftJoin('product_description').on('product_description.`product_id`', '=', 'product.`product_id`')
        .where('product_id', '=', id)
        .load(pool);
      return camelCase(result);
    },
    products: async (_, { }, { pool }) => {
      const rows = await select()
        .from('product')
        .leftJoin('product_description').on('product_description.`product_description_product_id`', '=', 'product.`product_id`')
        .execute(pool);
      return rows.map((row) => camelCase(row));
    }
  }
}
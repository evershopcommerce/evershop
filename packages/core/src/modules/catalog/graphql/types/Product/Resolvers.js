const { select } = require('@evershop/mysql-query-builder');
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
    }
  },

  Query: {
    product: (_, { id }, { pool }) => {
      return select()
        .from('product')
        .leftJoin('product_description', 'product_description.product_id', 'product.product_id')
        .where('product_id', id)
        .execute(pool)
        .then((result) => camelCase(result[0]));
    }
  }
}
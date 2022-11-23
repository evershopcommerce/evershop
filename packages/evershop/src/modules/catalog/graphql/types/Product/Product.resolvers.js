const { select } = require('@evershop/mysql-query-builder');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { camelCase } = require('../../../../../lib/util/camelCase');

module.exports = {
  Product: {
    categories: async (product, _, { pool }) => {
      const query = select()
        .from('category');
      query.leftJoin('category_description', 'des')
        .on('des.`category_description_category_id`', '=', 'category.`category_id`')
      return (
        await query
          .where(
            'category_id',
            'IN',
            (await select('category_id')
              .from('product_category')
              .where('product_id', '=', product.productId)
              .execute(pool)).map((row) => row.category_id)
          )
          .execute(pool)).map((row) => camelCase(row));
    },
    url: (product, _, { pool }) => {
      return buildUrl('productView', { url_key: product.urlKey });
    },
    editUrl: (product, _, { pool }) => {
      return buildUrl('productEdit', { id: product.productId });
    }
  },
  Query: {
    product: async (_, { id }, { pool }) => {
      const query = select()
        .from('product');
      query.leftJoin('product_description').on('product_description.`product_description_product_id`', '=', 'product.`product_id`')
      query.where('product_id', '=', id)
      const result = await query.load(pool);
      if (!result) {
        return null
      } else {
        return camelCase(result);
      }
    }
  }
}
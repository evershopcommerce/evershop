const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');

module.exports = {
  Product: {
    categories: async (product, _, { pool }) => {
      const query = select().from('category');
      query
        .leftJoin('category_description', 'des')
        .on(
          'des.category_description_category_id',
          '=',
          'category.category_id'
        );
      return (
        await query
          .where(
            'category_id',
            'IN',
            (
              await select('category_id')
                .from('product_category')
                .where('product_id', '=', product.productId)
                .execute(pool)
            ).map((row) => row.category_id)
          )
          .execute(pool)
      ).map((row) => camelCase(row));
    },
    url: (product) => buildUrl('productView', { url_key: product.urlKey }),
    editUrl: (product) => buildUrl('productEdit', { id: product.uuid }),
    updateApi: (product) => buildUrl('updateProduct', { id: product.uuid }),
    deleteApi: (product) => buildUrl('deleteProduct', { id: product.uuid })
  },
  Query: {
    product: async (_, { id }, { pool }) => {
      const query = select().from('product');
      query
        .leftJoin('product_description')
        .on(
          'product_description.product_description_product_id',
          '=',
          'product.product_id'
        );
      query.where('product_id', '=', id);
      const result = await query.load(pool);
      if (!result) {
        return null;
      } else {
        return camelCase(result);
      }
    }
  }
};

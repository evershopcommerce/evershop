const { select } = require('@evershop/postgres-query-builder');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');

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
    },
    searchProducts: async (
      _,
      { query = '', page = 1, limit = 20 },
      { user }
    ) => {
      // This is a simple search, we will search in name and sku.
      // This is only for admin
      if (!user) {
        return [];
      }
      const productsQuery = select().from('product');
      productsQuery
        .leftJoin('product_description', 'des')
        .on('product.product_id', '=', 'des.product_description_product_id');

      if (query) {
        productsQuery.where('des.name', 'LIKE', `%${query}%`);
        productsQuery.orWhere('product.sku', 'LIKE', `%${query}%`);
      }
      // Clone the main query for getting total right before doing the paging
      const totalQuery = productsQuery.clone();
      totalQuery.select('COUNT(product.product_id)', 'total');
      totalQuery.removeOrderBy();
      // Paging
      productsQuery.limit((page - 1) * limit, limit);
      const items = (await productsQuery.execute(pool)).map((row) =>
        camelCase(row)
      );

      const result = await totalQuery.load(pool);
      const total = result.total;
      return {
        items,
        total
      };
    }
  }
};

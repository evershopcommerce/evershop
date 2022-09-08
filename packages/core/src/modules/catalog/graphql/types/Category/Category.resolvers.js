const { select } = require('@evershop/mysql-query-builder');
const { camelCase } = require('../../../../../lib/util/camelCase');

module.exports = {
  Query: {
    category: async (_, { id }, { pool }) => {
      const query = select().from('category');
      query.leftJoin('category_description').on('category_description.`category_description_category_id`', '=', 'category.`category_id`')
      query.where('category_id', '=', id)
      const result = await query.load(pool)
      return camelCase(result[0]);
    },
    categories: async (_, { }, { pool }) => {
      const query = select().from('category');
      query.leftJoin('category_description').on('category_description.`category_description_category_id`', '=', 'category.`category_id`');
      const rows = await query.execute(pool)
      return rows.map((row) => camelCase(row));
    }
  },
  Category: {
    products: async (category, _, { pool }) => {
      const query = select()
        .from('product');
      query.leftJoin('product_description').on('product_description.`product_id`', '=', 'product.`product_id`');
      query.where(
        'product_id',
        'IN',
        await select('product_id')
          .from('product_category')
          .where('category_id', category.categoryId)
          .execute(pool)
      )
      const rows = await query.execute(pool);
      return rows.map((row) => camelCase(row));
    }
  }
}
const { select } = require('@evershop/mysql-query-builder');
const { camelCase } = require('@evershop/evershop/src/lib/util/camelCase');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');

module.exports = {
  Query: {
    featuredCategories: async (r, _, { pool }) => {
      const query = select('category.`category_id`')
        .select('category_description.`name`')
        .select('category_description.`description`')
        .select('category_description.`image`')
        .select('category_description.`url_key`')
        .from('category');
      query
        .leftJoin('category_description')
        .on(
          'category.`category_id`',
          '=',
          'category_description.`category_description_category_id`'
        );
      const categories = await query.execute(pool);
      return categories.map((category) => camelCase({ ...category, url_key: () => buildUrl('categoryView', { url_key: category.url_key }) }));
    }
  }
};

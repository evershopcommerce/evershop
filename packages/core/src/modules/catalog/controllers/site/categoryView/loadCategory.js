const { select } = require('@nodejscart/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack, next) => {
  try {
    const query = select();
    query.from('category')
      .leftJoin('category_description')
      .on('category.`category_id`', '=', 'category_description.`category_description_category_id`');

    query.where('category_description.`url_key`', '=', request.params.url_key);
    const category = await query.load(pool);
    if (category === null) {
      response.status(404);
      next();
    } else {
      assign(response.context, {
        category: JSON.parse(
          JSON.stringify(category)
        ),
        metaTitle: category.meta_title || category.name,
        metaDescription: category.meta_description || category.short_description
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};

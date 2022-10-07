const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { setContextValue } = require('../../../../graphql/services/contextHelper');

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
      setContextValue(request, 'categoryId', category.category_id);
      setContextValue(request, 'pageInfo', {
        title: category.meta_title || category.name,
        description: category.meta_description || category.short_description,
        url: request.url
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};

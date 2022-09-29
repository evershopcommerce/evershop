const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { setContextValue } = require('../../../../graphql/services/contextHelper');

module.exports = async (request, response, delegate, next) => {
  try {
    const query = select();
    query.from('category')
    query.andWhere('category.`category_id`', '=', request.params.id);
    query.leftJoin('category_description').on('category_description.`category_description_category_id`', '=', 'category.`category_id`')
    const category = await query.load(pool);

    if (category === null) {
      response.status(404);
      next();
    } else {
      setContextValue(request, 'categoryId', category.category_id);
      setContextValue(request, 'pageInfo', {
        title: category.meta_title || category.name,
        description: category.meta_description || category.short_description
      });
      next();
    }
  } catch (e) {
    next(e);
  }
};

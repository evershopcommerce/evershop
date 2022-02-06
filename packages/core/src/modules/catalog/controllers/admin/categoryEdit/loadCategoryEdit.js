const { select } = require('@nodejscart/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack, next) => {
  const query = select();
  query.from('category').leftJoin('category_description').on('category.`category_id`', '=', 'category_description.`category_description_category_id`');
  query.where('category_id', '=', request.params.id);
  const category = await query.load(pool);
  if (category === null) {
    request.session.notifications = request.session.notifications || [];
    request.session.notifications.push({
      type: 'error',
      message: 'Requested category does not exist'
    });
    request.session.save();
    response.redirect(302, buildUrl('categoryGrid'));
  } else {
    assign(response.context, { category: JSON.parse(JSON.stringify(category)) });
    assign(response.context, { page: { heading: category.name } });
    next();
  }
};

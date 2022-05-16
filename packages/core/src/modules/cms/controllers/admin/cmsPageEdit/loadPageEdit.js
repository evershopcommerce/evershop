const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack, next) => {
  const query = select();
  query.from('cms_page').leftJoin('cms_page_description').on('cms_page.`cms_page_id`', '=', 'cms_page_description.`cms_page_description_cms_page_id`');
  query.where('cms_page_id', '=', request.params.id);
  const page = await query.load(pool);
  if (page === null) {
    request.session.notifications = request.session.notifications || [];
    request.session.notifications.push({
      type: 'error',
      message: 'Requested page does not exist'
    });
    request.session.save();
    response.redirect(302, buildUrl('pageGrid'));
  } else {
    assign(response.context, { page: JSON.parse(JSON.stringify(page)) });
    assign(response.context, { page: { heading: page.name } });
    next();
  }
};

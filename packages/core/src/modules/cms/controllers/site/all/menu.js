const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response) => {
  const query = select('name')
    .select('url_key')
    .from('category', 'cat');
  query.leftJoin('category_description', 'des')
    .on('cat.`category_id`', '=', 'des.`category_description_category_id`');
  query.where('cat.`status`', '=', 1).and('cat.`include_in_nav`', '=', 1);

  const items = (await query.execute(pool)).map((i) => ({
    name: i.name,
    url: buildUrl('categoryView', { url_key: i.url_key })
  }));

  assign(response.context, { menuItems: items });
};

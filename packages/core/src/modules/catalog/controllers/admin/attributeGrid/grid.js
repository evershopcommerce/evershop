const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');

module.exports = async (request, response, stack) => {
  // execute query
  const query = stack.queryInit;

  let limit = 20;// Default limit
  // Limit
  if (/^[0-9]+$/.test(request.query.limit)) { limit = parseInt(request.query.limit, 10); }

  let page = 1;
  // pagination
  if (/^[0-9]+$/.test(request.query.page)) { page = parseInt(request.query.page, 10); }
  assign(response.context, { grid: { page, limit } });
  query.limit((page - 1) * limit, limit);

  // Order by
  let orderBy = 'attribute.`attribute_id`';
  if (request.query.sort_by) { orderBy = request.query.sort_by; }

  let direction = 'DESC';
  if (request.query.sort_order === 'ASC') { direction = 'DESC'; }

  query.orderBy(orderBy, direction);
  const attributes = await query.execute(pool);
  assign(response.context, { grid: { attributes: JSON.parse(JSON.stringify(attributes)) } });

  query.select('COUNT(`attribute_id`)', 'total');
  query.limit(0, 1);
  const ps = await query.execute(pool);
  assign(response.context, { grid: { total: ps[0].total } });
  assign(response.context, { page: { heading: 'Attributes' } });

  return attributes;
};

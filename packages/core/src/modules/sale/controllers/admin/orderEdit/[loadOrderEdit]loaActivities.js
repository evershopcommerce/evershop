const { select } = require('@evershop/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');
const { get } = require('../../../../../lib/util/get');

module.exports = async (request, response) => {
  const order = get(response.context, 'order');
  const activities = await select()
    .from('order_activity')
    .orderBy('created_at', 'desc')
    .where('order_activity_order_id', '=', order.order_id)
    .execute(pool);
  assign(response.context, { order: { activities: JSON.parse(JSON.stringify(activities)) } });
};

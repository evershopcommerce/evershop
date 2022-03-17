const { select } = require('@nodejscart/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');
const { get } = require('../../../../../lib/util/get');

module.exports = async (request, response) => {
  const order = get(response.context, 'order');
  const query = select('order_item.*', 'product.`image`')
    .from('order_item');
  query.leftJoin('product').on('order_item.product_id', '=', 'product.`product_id`');
  const items = await query.where('order_item.order_item_order_id', '=', order.order_id)
    .execute(pool);
  assign(response.context, { order: { items: JSON.parse(JSON.stringify(items)) } });
};

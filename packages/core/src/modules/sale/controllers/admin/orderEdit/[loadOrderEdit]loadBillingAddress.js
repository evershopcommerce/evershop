const { select } = require('@nodejscart/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');
const { get } = require('../../../../../lib/util/get');

module.exports = async (request, response) => {
  const order = get(response.context, 'order');
  const billingAddress = await select()
    .from('order_address')
    .where('order_address_id', '=', order.billing_address_id)
    .load(pool);
  assign(response.context, {
    order:
    {
      billingAddress: JSON.parse(JSON.stringify(billingAddress))
    }
  });
};

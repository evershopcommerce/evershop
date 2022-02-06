const { select } = require('@nodejscart/mysql-query-builder');
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');
const { get } = require('../../../../../lib/util/get');

module.exports = async (request, response) => {
  const order = get(response.context, 'order');
  const shipment = await select().from('shipment').where('shipment_order_id', '=', order.order_id).load(pool);
  if (shipment) {
    assign(response.context, {
      order: { shipment: JSON.parse(JSON.stringify(shipment)) }
    });
  }
};

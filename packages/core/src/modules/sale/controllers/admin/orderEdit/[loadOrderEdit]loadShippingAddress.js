const { select } = require('@nodejscart/mysql-query-builder')
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require("../../../../../lib/util/assign");
const { get } = require('../../../../../lib/util/get');

module.exports = async (request, response, stack) => {
    let order = get(response.context, 'order');
    let shippingAddress = await select()
        .from('order_address')
        .where('order_address_id', '=', order.shipping_address_id)
        .load(pool);
    assign(response.context, { order: { shippingAddress: JSON.parse(JSON.stringify(shippingAddress)) } });
}
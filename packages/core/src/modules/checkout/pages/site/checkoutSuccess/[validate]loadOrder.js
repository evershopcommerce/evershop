const { select } = require('@evershop/mysql-query-builder');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { assign } = require('../../../../../lib/util/assign');
const { pool } = require('../../../../../lib/mysql/connection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack) => {
  const order = await select('*').from('order').where('order_id', '=', request.session.orderId).load(pool);
  if (!order) {
    response.redirect(302, buildUrl('homepage'));
    return null;
  } else {
    // Remove orderId from session
    request.session.orderId = undefined;
    assign(response.context, {
      order: {
        ...order,
        shippingAddress: JSON.parse(JSON.stringify(await select()
          .from('order_address')
          .where('order_address_id', '=', order.shipping_address_id)
          .load(pool))),
        billingAddress: JSON.parse(JSON.stringify(await select()
          .from('order_address')
          .where('order_address_id', '=', order.billing_address_id)
          .load(pool))),
        items: JSON.parse(JSON.stringify(await select()
          .from('order_item')
          .where('order_item_order_id', '=', order.order_id)
          .execute(pool)))
      }
    });
    return order;
  }
};

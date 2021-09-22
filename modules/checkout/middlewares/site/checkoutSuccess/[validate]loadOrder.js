const { buildSiteUrl } = require("../../../../../lib/routie");
const { assign } = require("../../../../../lib/util/assign");
const { select } = require("@nodejscart/mysql-query-builder");
const { pool } = require("../../../../../lib/mysql/connection");

module.exports = async (request, response, stack) => {
    let order = await select("*").from("order").where('order_id', '=', request.session.orderId).load(pool);
    if (!order) {
        response.redirect(302, buildSiteUrl("homepage"));
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
        })
        return order;
    }
};
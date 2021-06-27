const { select } = require("@nodejscart/mysql-query-builder");
const { pool } = require("../../../../../lib/mysql/connection");
const { assign } = require("../../../../../lib/util/assign");

module.exports = async (request, response, stack) => {
    let cart = await stack["initCart"];

    if (cart.getData("shipping_address_id")) {
        assign(response.context.cart, { shippingAddress: await select("cart_address").where("cart_address_id", "=", cart.getData("shipping_address_id")).load(pool) });
    }

    if (cart.getData("billing_address_id")) {
        assign(response.context.cart, { billingAddress: await select("cart_address").where("cart_address_id", "=", cart.getData("billing_address_id")).load(pool) });
    }
};
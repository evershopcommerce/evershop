const { insert, select } = require("@nodejscart/mysql-query-builder");
const { pool } = require("../../../../../lib/mysql/connection");

module.exports = async (request, response, stack, next) => {
    let cart = await stack["initCart"];
    try {
        await cart.setData("customer_email", request.body.email);
        await cart.setData("customer_full_name", request.body.email);
        response.$body = {
            data: {
                email: cart.getData("customer_email"),
                full_name: cart.getData("customer_full_name")
            },
            success: true,
            message: ""
        };
    } catch (e) {
        response.$body = {
            data: {},
            success: false,
            message: e.message
        };
    }
    next();
};
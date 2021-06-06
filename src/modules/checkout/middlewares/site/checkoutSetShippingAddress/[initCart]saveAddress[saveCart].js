const { insert, select } = require("@nodejscart/mysql-query-builder");
const { pool } = require("../../../../../lib/mysql/connection");

module.exports = async (request, response, stack, next) => {
    let cart = await stack["initCart"];
    try {
        let result = await insert("cart_address").given(request.body).execute(pool);
        // Set shipping address ID
        await cart.setData("shipping_address_id", parseInt(result.insertId));
        response.$body = {
            data: {
                address: await select().from("cart_address").where("cart_address_id", "=", result.insertId).load(pool)
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
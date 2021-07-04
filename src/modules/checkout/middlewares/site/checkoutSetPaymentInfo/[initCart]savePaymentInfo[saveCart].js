const { insert, select } = require("@nodejscart/mysql-query-builder");
const { pool } = require("../../../../../lib/mysql/connection");
const { addressValidator } = require("../../../services/addressValidator");

module.exports = async (request, response, stack, next) => {
    let cart = await stack["initCart"];
    try {
        // 
        if (request.body.use_shipping_address == 1) {
            await cart.setData("billing_address_id", cart.getData("shipping_address_id"));
        } else {
            // Validate address
            if (!addressValidator(request.body))
                throw new TypeError("Invalid Address");

            // Save shipping address
            let result = await insert("cart_address").given(request.body).execute(pool);

            // Set shipping address ID
            await cart.setData("billing_address_id", parseInt(result.insertId));
        }

        // Save shipping method
        await cart.setData("payment_method", request.body.payment_method);
        next();
    } catch (e) {
        response.json({
            data: {},
            success: false,
            message: e.message
        });
    }
};
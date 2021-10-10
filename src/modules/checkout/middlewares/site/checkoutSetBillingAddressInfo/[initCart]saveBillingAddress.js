const { insert, update } = require("@nodejscart/mysql-query-builder");
const { pool } = require("../../../../../lib/mysql/connection");
const { addressValidator } = require("../../../services/addressValidator");

module.exports = async (request, response, stack, next) => {
    let body = request.body;
    let cart = await stack["initCart"];
    try {
        // Use shipping address as a billing address
        if (body.use_shipping_address) {
            // Delete if exist billing address
            await update('cart')
                .given({ billing_address_id: null })
                .where('cart_id', '=', cart.getData('cart_id'))
                .execute(pool);
        } else {
            // Validate address
            if (!addressValidator(body))
                throw new TypeError("Invalid Address");
            // Save billing address
            let result = await insert("cart_address").given(body).execute(pool);

            // Set shipping address ID
            await cart.setData("billing_address_id", parseInt(result.insertId));
        }

        response.json({
            data: {},
            success: true,
            message: ''
        })
    } catch (e) {
        response.json({
            data: {},
            success: true,
            message: e.message
        })
    }
};
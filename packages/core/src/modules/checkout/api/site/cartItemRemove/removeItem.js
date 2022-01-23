const { del } = require("@nodejscart/mysql-query-builder");
const { pool } = require("../../../../../lib/mysql/connection");

module.exports = async (request, response, stack, next) => {
    try {
        // TODO: this should be improved
        let itemId = request.params.id;
        del('cart_item')
            .where('cart_item_id', '=', itemId)
            .execute(pool);
        response.json({
            data: {},
            success: true,
            message: "Product was removed from the cart successfully"
        });
    } catch (error) {
        response.json({
            data: {},
            success: false,
            message: e.message
        });
    }
}
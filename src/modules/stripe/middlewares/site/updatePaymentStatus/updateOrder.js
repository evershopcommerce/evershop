const { select } = require("@nodejscart/mysql-query-builder");
const { pool } = require("../../../../../lib/mysql/connection");

module.exports = async (request, response, stack, next) => {
    let orderId = request.params.id;
    let { transactionId, amount } = request.body;

    //Validate the order;
    let order = await select()
        .from('order')
        .where('order_id', "=", orderId)
        .load(pool);

    if (!order) {
        response.json({
            data: {},
            success: false,
            message: "Requested order does not exist"
        })
    } else {

    }
}
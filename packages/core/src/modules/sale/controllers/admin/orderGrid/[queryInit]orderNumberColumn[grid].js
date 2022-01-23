const { assign } = require("../../../../../lib/util/assign");

module.exports = (request, response, stack) => {
    // Handle filter
    if (request.query["order_number"] !== undefined) {
        let query = stack["queryInit"];
        query.andWhere("`order`.`order_number`", "LIKE", `%${request.query["order_number"]}%`);
        assign(response.context, { grid: { currentFilter: { order_number: request.query["order_number"] } } });
    }
}
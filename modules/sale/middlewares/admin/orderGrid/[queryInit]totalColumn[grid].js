const { assign } = require("../../../../../lib/util/assign");

module.exports = (request, response, stack) => {
    // Handle filter
    if (request.query["grand_total"] !== undefined) {
        let query = stack["queryInit"];
        query.andWhere("`order`.`grand_total`", "LIKE", `%${request.query["grand_total"]}%`);
        assign(response.context, { grid: { currentFilter: { grand_total: request.query["grand_total"] } } });
    }
}
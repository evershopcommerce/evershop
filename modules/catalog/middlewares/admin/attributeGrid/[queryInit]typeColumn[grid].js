const { assign } = require("../../../../../lib/util/assign");

module.exports = (request, response, stack) => {
    // Handle filter
    if (request.query["type"] !== undefined) {
        let query = stack["queryInit"];
        query.andWhere("attribute.`type`", "=", request.query["type"]);
        assign(response.context, { grid: { currentFilter: { type: request.query["type"] } } });
    }
}
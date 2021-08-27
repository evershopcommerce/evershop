const { assign } = require("../../../../../lib/util/assign");

module.exports = (request, response, stack) => {
    // Handle filter
    if (request.query["name"] !== undefined) {
        let query = stack["queryInit"];
        query.andWhere("attribute.`name`", "LIKE", `%${request.query["name"]}%`);
        assign(response.context, { grid: { currentFilter: { name: request.query["name"] } } });
    }
}
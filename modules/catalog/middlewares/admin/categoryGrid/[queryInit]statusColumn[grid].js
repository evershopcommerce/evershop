const { assign } = require("../../../../../lib/util/assign");

module.exports = (request, response, stack) => {
    // Handle filter
    if (parseInt(request.query["status"]) === 0 || parseInt(request.query["status"]) === 1) {
        let query = stack["queryInit"];
        query.andWhere("category.`status`", "=", parseInt(request.query["status"]));
        assign(response.context, { grid: { currentFilter: { status: parseInt(request.query["status"]) } } });
    }
}
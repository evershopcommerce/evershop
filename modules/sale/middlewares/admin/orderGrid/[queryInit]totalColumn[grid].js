const { getComponentSource } = require("../../../../../lib/helpers");
const { assign } = require("../../../../../lib/util/assign");

module.exports = (request, response, stack) => {
    // Add total column to the grid
    response.addComponent("totalColumn", "orderGridHeader", getComponentSource("grid/headers/basic.js"), { "title": "Total", "id": "grand_total" }, 5);
    response.addComponent("totalRow", "orderGridRow", getComponentSource("grid/rows/basic.js"), { "id": "grand_total" }, 5);
    // Handle filter
    if (request.query["grand_total"] !== undefined) {
        let query = stack["queryInit"];
        query.andWhere("order.`grand_total`", "LIKE", `%${request.query["grand_total"]}%`);
        assign(response.context, { grid: { currentFilter: { grand_total: request.query["grand_total"] } } });
    }
}
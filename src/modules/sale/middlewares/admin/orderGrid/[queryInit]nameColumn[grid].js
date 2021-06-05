const { getComponentSource } = require("../../../../../lib/helpers");
import { assign } from "../../../../../lib/util/assign";

module.exports = (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("nameColumn", "orderGridHeader", getComponentSource("grid/headers/basic.js"), { "title": "Customer name", "id": "customer_name" }, 5);
    response.addComponent("nameRow", "orderGridRow", getComponentSource("grid/rows/basic.js"), { "id": "customer_full_name" }, 5);
    // Handle filter
    if (request.query["customer_name"] !== undefined) {
        let query = stack["queryInit"];
        query.andWhere("order.`customer_full_name`", "LIKE", `%${request.query["customer_name"]}%`);
        assign(response.context, { grid: { currentFilter: { customer_name: request.query["customer_name"] } } });
    }
}
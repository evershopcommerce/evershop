const { getComponentSource } = require("../../../../../lib/helpers");
import { assign } from "../../../../../lib/util/assign";

module.exports = (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("emailColumn", "orderGridHeader", getComponentSource("grid/headers/basic.js"), { "title": "Customer email", "id": "customer_email" }, 5);
    response.addComponent("emailRow", "orderGridRow", getComponentSource("grid/rows/basic.js"), { "id": "customer_email" }, 5);
    // Handle filter
    if (request.query["customer_email"] !== undefined) {
        let query = stack["queryInit"];
        query.andWhere("order.`customer_email`", "LIKE", `%${request.query["customer_email"]}%`);
        assign(response.context, { grid: { currentFilter: { customer_email: request.query["customer_email"] } } });
    }
}
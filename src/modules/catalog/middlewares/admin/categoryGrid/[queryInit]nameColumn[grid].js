const { getComponentSource } = require("../../../../../lib/helpers");
import { assign } from "../../../../../lib/util/assign";

module.exports = (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("nameColumn", "categoryGridHeader", getComponentSource("grid/headers/basic.js"), { "title": "Category name", "id": "name" }, 5);
    response.addComponent("nameRow", "categoryGridRow", getComponentSource("grid/rows/basic.js"), { "id": "name" }, 5);
    // Handle filter
    if (request.query["name"] !== undefined) {
        let query = stack["queryInit"];
        query.andWhere("category_description.`name`", "LIKE", `%${request.query["name"]}%`);
        assign(response.context, { grid: { currentFilter: { name: request.query["name"] } } });
    }
}
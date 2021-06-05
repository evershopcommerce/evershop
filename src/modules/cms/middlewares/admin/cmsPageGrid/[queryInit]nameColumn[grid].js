const { getComponentSource } = require("../../../../../lib/helpers");
import { assign } from "../../../../../lib/util/assign";

module.exports = (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("nameColumn", "pageGridHeader", getComponentSource("grid/headers/basic.js"), { "title": "Page name", "id": "name" }, 5);
    response.addComponent("nameRow", "pageGridRow", getComponentSource("grid/rows/basic.js"), { "id": "name" }, 5);
    // Handle filter
    if (request.query["name"] !== undefined) {
        let query = stack["queryInit"];
        query.andWhere("cms_page_description.`name`", "LIKE", `%${request.query["name"]}%`);
        assign(response.context, { grid: { currentFilter: { name: request.query["name"] } } });
    }
}
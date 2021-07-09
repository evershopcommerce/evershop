const { getComponentSource } = require("../../../../../lib/helpers");
const { assign } = require("../../../../../lib/util/assign");

module.exports = (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("nameColumn", "productGridHeader", getComponentSource("grid/headers/basic.js"), { "title": "Product name", "id": "name" }, 5);
    response.addComponent("nameRow", "productGridRow", getComponentSource("grid/rows/basic.js"), { "id": "name" }, 5);
    // Handle filter
    if (request.query["name"] !== undefined) {
        let query = stack["queryInit"];
        query.andWhere("product_description.`name`", "LIKE", `%${request.query["name"]}%`);
        assign(response.context, { grid: { currentFilter: { name: request.query["name"] } } });
    }
}
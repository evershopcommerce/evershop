const { getComponentSource } = require("../../../../../lib/util");
import { assign } from "../../../../../lib/util/assign";

module.exports = (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("skuColumn", "productGridHeader", getComponentSource("grid/headers/basic.js"), { "title": "SKU", "id": "sku" }, 15);
    response.addComponent("skuRow", "productGridRow", getComponentSource("grid/rows/basic.js"), { "id": "sku" }, 15);
    // Handle filter
    if (request.query["sku"] !== undefined) {
        let query = stack["queryInit"];
        query.andWhere("product.`sku`", "LIKE", `%${request.query["sku"]}%`);
        assign(response.context, { grid: { currentFilter: { sku: request.query["sku"] } } });
    }
}
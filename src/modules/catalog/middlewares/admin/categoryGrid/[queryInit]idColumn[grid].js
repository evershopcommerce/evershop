const { getComponentSource } = require("../../../../../lib/helpers");
import { assign } from "../../../../../lib/util/assign";

module.exports = (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("idColumn", "categoryGridHeader", getComponentSource("grid/headers/fromTo.js"), { "title": "ID", "id": "id" }, 1);
    response.addComponent("idRow", "categoryGridRow", getComponentSource("grid/rows/basic.js"), { "id": "category_id" }, 1);

    // Handle filter
    // Handle filter
    if (request.query["id"] !== undefined) {
        let query = stack["queryInit"];
        if (/^[0-9]+[-][0-9]+$/.test(request.query["id"])) {
            let ranges = request.query["id"].split("-");
            query.andWhere("category.`category_id`", ">=", ranges[0]);
            query.andWhere("category.`category_id`", "<=", ranges[1]);
            assign(response.context, { grid: { currentFilter: { id: { from: ranges[0], to: ranges[1] } } } });
        } else if (/^[0-9]+[-]$/.test(request.query["id"])) {
            let ranges = request.query["id"].split("-");
            query.andWhere("category.`category_id`", ">=", ranges[0]);
            assign(response.context, { grid: { currentFilter: { id: { from: ranges[0], to: undefined } } } });
        } else if (/^[-][0-9]+$/.test(request.query["id"])) {
            let ranges = request.query["id"].split("-");
            query.andWhere("category.`category_id`", "<=", ranges[1]);
            assign(response.context, { grid: { currentFilter: { id: { from: undefined, to: ranges[1] } } } });
        } else
            return
    }
}
const { getComponentSource } = require("../../../../../lib/helpers");
import { assign } from "../../../../../lib/util/assign";

module.exports = (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("idColumn", "pageGridHeader", getComponentSource("grid/headers/fromTo.js"), { "title": "ID", "id": "id" }, 1);
    response.addComponent("idRow", "pageGridRow", getComponentSource("grid/rows/basic.js"), { "id": "cms_page_id" }, 1);

    // Handle filter
    // Handle filter
    if (request.query["id"] !== undefined) {
        let query = stack["queryInit"];
        if (/^[0-9]+[-][0-9]+$/.test(request.query["id"])) {
            let ranges = request.query["id"].split("-");
            query.andWhere("cms_page.`cms_page_id`", ">=", ranges[0]);
            query.andWhere("cms_page.`cms_page_id`", "<=", ranges[1]);
            assign(response.context, { grid: { currentFilter: { id: { from: ranges[0], to: ranges[1] } } } });
        } else if (/^[0-9]+[-]$/.test(request.query["id"])) {
            let ranges = request.query["id"].split("-");
            query.andWhere("cms_page.`cms_page_id`", ">=", ranges[0]);
            assign(response.context, { grid: { currentFilter: { id: { from: ranges[0], to: undefined } } } });
        } else if (/^[-][0-9]+$/.test(request.query["id"])) {
            let ranges = request.query["id"].split("-");
            query.andWhere("cms_page.`cms_page_id`", "<=", ranges[1]);
            assign(response.context, { grid: { currentFilter: { id: { from: undefined, to: ranges[1] } } } });
        } else
            return
    }
}
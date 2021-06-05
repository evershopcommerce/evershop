const { getComponentSource } = require("../../../../../lib/helpers");
import { assign } from "../../../../../lib/util/assign";

module.exports = (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("qtyColumn", "productGridHeader", getComponentSource("grid/headers/fromTo.js"), { "title": "Qty", "id": "qty" }, 20);
    response.addComponent("qtyRow", "productGridRow", getComponentSource("grid/rows/basic.js"), { "id": "qty" }, 20);

    // Handle filter
    if (request.query["qty"] !== undefined) {
        let query = stack["queryInit"];
        if (/^[0-9]+[-][0-9]+$/.test(request.query["qty"])) {
            let ranges = request.query["qty"].split("-");
            query.andWhere("product.`qty`", ">=", ranges[0]);
            query.andWhere("product.`qty`", "<=", ranges[1]);
            assign(response.context, { grid: { currentFilter: { qty: { from: ranges[0], to: ranges[1] } } } });
        } else if (/^[0-9]+[-]$/.test(request.query["qty"])) {
            let ranges = request.query["qty"].split("-");
            query.andWhere("product.`qty`", ">=", ranges[0]);
            assign(response.context, { grid: { currentFilter: { qty: { from: ranges[0], to: undefined } } } });
        } else if (/^[-][0-9]+$/.test(request.query["qty"])) {
            let ranges = request.query["qty"].split("-");
            query.andWhere("product.`qty`", "<=", ranges[1]);
            assign(response.context, { grid: { currentFilter: { qty: { from: undefined, to: ranges[1] } } } });
        } else
            return
    }
}
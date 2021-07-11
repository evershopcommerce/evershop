const { assign } = require("../../../../../lib/util/assign");

module.exports = (request, response, stack) => {
    // Handle filter
    if (request.query["id"] !== undefined) {
        let query = stack["queryInit"];
        if (/^[0-9]+[-][0-9]+$/.test(request.query["id"])) {
            let ranges = request.query["id"].split("-");
            query.andWhere("product.`product_id`", ">=", ranges[0]);
            query.andWhere("product.`product_id`", "<=", ranges[1]);
            assign(response.context, { grid: { currentFilter: { id: { from: ranges[0], to: ranges[1] } } } });
        } else if (/^[0-9]+[-]$/.test(request.query["id"])) {
            let ranges = request.query["id"].split("-");
            query.andWhere("product.`product_id`", ">=", ranges[0]);
            assign(response.context, { grid: { currentFilter: { id: { from: ranges[0], to: undefined } } } });
        } else if (/^[-][0-9]+$/.test(request.query["id"])) {
            let ranges = request.query["id"].split("-");
            query.andWhere("product.`product_id`", "<=", ranges[1]);
            assign(response.context, { grid: { currentFilter: { id: { from: undefined, to: ranges[1] } } } });
        } else
            return
    }
}
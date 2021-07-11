const { assign } = require("../../../../../lib/util/assign");

module.exports = (request, response, stack) => {
    // Handle filter
    if (request.query["price"] !== undefined) {
        let query = stack["queryInit"];
        if (/^\d+(\.\d+)?[-]\d+(\.\d+)?$/.test(request.query["price"])) {
            let ranges = request.query["price"].split("-");
            query.andWhere("product.`price`", ">=", ranges[0]);
            query.andWhere("product.`price`", "<=", ranges[1]);
            assign(response.context, { grid: { currentFilter: { price: { from: ranges[0], to: ranges[1] } } } });
        } else if (/^\d+(\.\d+)?[-]$/.test(request.query["price"])) {
            let ranges = request.query["price"].split("-");
            query.andWhere("product.`price`", ">=", ranges[0]);
            assign(response.context, { grid: { currentFilter: { price: { from: ranges[0], to: undefined } } } });
        } else if (/^[-]\d+(\.\d+)?$/.test(request.query["price"])) {
            let ranges = request.query["price"].split("-");
            query.andWhere("product.`price`", "<=", ranges[1]);
            assign(response.context, { grid: { currentFilter: { price: { from: undefined, to: ranges[1] } } } });
        } else
            return
    }
}
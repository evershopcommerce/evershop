const { assign } = require("../../../../../lib/util/assign");

module.exports = (request, response, stack) => {
    // Handle filter
    if (request.query["shipment_status"]) {
        let query = stack["queryInit"];
        query.andWhere("order.`shipment_status`", "=", request.query["shipment_status"]);
        assign(response.context, { grid: { currentFilter: { shipment_status: request.query["shipment_status"] } } });
    }
}
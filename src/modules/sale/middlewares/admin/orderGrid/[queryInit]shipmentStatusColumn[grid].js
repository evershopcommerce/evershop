const { getComponentSource } = require("../../../../../lib/helpers");
import { assign } from "../../../../../lib/util/assign";

module.exports = (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("shipmentStatusColumn", "orderGridHeader", getComponentSource("grid/headers/status.js"), { "title": "Shipment status", "id": "shipmentStatus" }, 25);
    response.addComponent("shipmentStatusRow", "orderGridRow", getComponentSource("sale/components/admin/order/grid/shipmentStatus.js"), { "id": "shipment_status" }, 25);

    // Handle filter
    if (request.query["shipment_status"]) {
        let query = stack["queryInit"];
        query.andWhere("order.`shipment_status`", "=", request.query["shipment_status"]);
        assign(response.context, { grid: { currentFilter: { shipment_status: request.query["shipment_status"] } } });
    }
}
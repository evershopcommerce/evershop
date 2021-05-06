const { getComponentSource } = require("../../../../../lib/util");
import { get } from "../../../../../lib/util/get";
import { buildAdminUrl } from "../../../../../lib/routie";

module.exports = async (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("actionHeader", "orderGridHeader", getComponentSource("grid/headers/action.js"), { "gridOriginalUrl": buildAdminUrl("orderGrid") }, 35);
    response.addComponent("actionRow", "orderGridRow", getComponentSource("grid/rows/action.js"), { "id": "action" }, 35);

    await stack["grid"];

    let orders = get(response.context, "grid.orders", []);
    orders.forEach(function (el, index) {
        this[index]["editUrl"] = buildAdminUrl("orderEdit", { id: parseInt(this[index]["order_id"]) });
    }, orders);
}
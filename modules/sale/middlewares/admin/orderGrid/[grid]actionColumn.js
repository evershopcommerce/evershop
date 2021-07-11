const { get } = require("../../../../../lib/util/get");
const { buildAdminUrl } = require("../../../../../lib/routie");

module.exports = async (request, response, stack) => {
    await stack["grid"];

    let orders = get(response.context, "grid.orders", []);
    orders.forEach(function (el, index) {
        this[index]["editUrl"] = buildAdminUrl("orderEdit", { id: parseInt(this[index]["order_id"]) });
    }, orders);
}
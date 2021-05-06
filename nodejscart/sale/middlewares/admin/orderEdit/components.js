const { getComponentSource } = require("../../../../../lib/util");
const { buildSiteUrl } = require("../../../../../lib/routie");

module.exports = (request, response) => {
    // 2 columns layout block
    response.addComponent(
        "orderEditLayout",
        "content",
        getComponentSource("sale/components/admin/order/edit/layout.js"),
        {},
        10
    );

    // General block
    response.addComponent(
        "general",
        "leftSide",
        getComponentSource("sale/components/admin/order/edit/general.js"),
        {},
        10
    );

    // Shipment block
    response.addComponent(
        "shipment",
        "leftSide",
        getComponentSource("sale/components/admin/order/edit/shipment.js"),
        {},
        20
    );

    // Payment block
    response.addComponent(
        "payment",
        "leftSide",
        getComponentSource("sale/components/admin/order/edit/payment.js"),
        {},
        30
    );

    // Items block
    response.addComponent(
        "items",
        "leftSide",
        getComponentSource("sale/components/admin/order/edit/items.js"),
        {},
        40
    );

    // Summary block
    response.addComponent(
        "summary",
        "rightSide",
        getComponentSource("sale/components/admin/order/edit/summary.js"),
        {},
        40
    );
};
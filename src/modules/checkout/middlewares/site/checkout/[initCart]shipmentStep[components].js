const { getComponentSource } = require("../../../../../lib/helpers");

module.exports = async (request, response, stack) => {
    // Shipping info block
    response.addComponent(
        "checkoutShipmentStep",
        "checkoutSteps",
        getComponentSource("checkout/components/site/checkout/shipment/shipmentStep.js"),
        {
        },
        10
    );

    let cart = await stack["initCart"];
    response.context.checkoutSteps = response.context.checkoutSteps || [];
    response.context.checkoutSteps.push({ id: "shipment", title: "Shipping", isCompleted: false, sortOrder: 10 });
};
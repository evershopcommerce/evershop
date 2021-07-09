const { assign } = require('../../../../../lib/util/assign');
const { addressValidator } = require('../../../services/addressValidator');
const { getComponentSource } = require("../../../../../lib/helpers");
const { buildSiteUrl } = require('../../../../../lib/routie');

module.exports = async (request, response, stack) => {
    // Shipment step
    response.addComponent(
        "checkoutShipmentStep",
        "checkoutSteps",
        getComponentSource("checkout/components/site/checkout/shipment/shipmentStep.js"),
        {
        },
        10
    );

    let cart = await stack["initCart"];
    let step = { id: "shipment", title: "Shipping", isCompleted: false, sortOrder: 10 };
    if (addressValidator(cart.getData("shippingAddress")) && cart.getData("shipping_method")) {
        step.isCompleted = true;
    }
    assign(response.context, { checkout: { steps: [step], setShipmentInfoAPI: buildSiteUrl("checkoutSetShipmentInfo") } })
};
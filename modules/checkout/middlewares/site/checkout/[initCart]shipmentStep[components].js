const { assign } = require('../../../../../lib/util/assign');
const { addressValidator } = require('../../../services/addressValidator');
const { buildSiteUrl } = require('../../../../../lib/routie');

module.exports = async (request, response, stack) => {
    let cart = await stack["initCart"];
    let step = { id: "shipment", title: "Shipping", isCompleted: false, sortOrder: 10 };
    if (addressValidator(cart.getData("shippingAddress")) && cart.getData("shipping_method")) {
        step.isCompleted = true;
    }
    assign(response.context, { checkout: { steps: [step], setShipmentInfoAPI: buildSiteUrl("checkoutSetShipmentInfo") } })
};
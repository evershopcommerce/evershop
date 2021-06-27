const { getComponentSource } = require("../../../../../lib/helpers");

module.exports = async (request, response, stack) => {
    // Shipping info block
    response.addComponent(
        "checkoutPaymentStep",
        "checkoutSteps",
        getComponentSource("checkout/components/site/checkout/payment/paymentStep.js"),
        {
        },
        15
    );
    let cart = await stack["initCart"];
    response.context.checkoutSteps = response.context.checkoutSteps || [];
    response.context.checkoutSteps.push({ id: "payment", title: "Billing", isCompleted: false, sortOrder: 15 });
};
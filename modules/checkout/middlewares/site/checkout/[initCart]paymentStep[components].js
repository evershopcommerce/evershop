const { getComponentSource } = require("../../../../../lib/helpers");
const { buildSiteUrl } = require("../../../../../lib/routie");
const { assign } = require("../../../../../lib/util/assign");
const { addressValidator } = require("../../../services/addressValidator");

module.exports = async (request, response, stack) => {

    // Payment step
    response.addComponent(
        "checkoutPaymentStep",
        "checkoutSteps",
        getComponentSource("checkout/components/site/checkout/payment/paymentStep.js"),
        {
        },
        15
    );

    let cart = await stack["initCart"];
    let step = { id: "payment", title: "Billing", isCompleted: false, sortOrder: 15 };
    if (addressValidator(cart.getData("billingAddress")) && cart.getData("payment_method")) {
        step.isCompleted = true;
    }
    assign(response.context, {
        checkout: {
            steps: [step],
            setPaymentInfoAPI: buildSiteUrl("checkoutSetPaymentInfo"),
            getPaymentMethodsAPI: buildSiteUrl("checkoutGetPaymentMethods"),
            placeOrderAPI: buildSiteUrl("checkoutPlaceOrderAPI"),
            checkoutSuccessPage: buildSiteUrl("checkoutSuccess")
        }
    })
};
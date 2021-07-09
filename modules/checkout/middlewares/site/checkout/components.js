const config = require("config");
const { getComponentSource } = require("../../../../../lib/helpers");
const { buildSiteUrl } = require("../../../../../lib/routie");

module.exports = (request, response) => {
    response.addComponent(
        "checkoutPage",
        "contentMiddle",
        getComponentSource("checkout/components/site/checkout/checkout.js"),
        {
        },
        0
    );

    // Shipping methods
    response.addComponent(
        "checkoutShippingMethods",
        "checkoutShippingAddressForm",
        getComponentSource("checkout/components/site/checkout/shipment/shippingMethods.js"),
        {
            getMethodsAPI: buildSiteUrl("checkoutGetShippingMethods")
        },
        100
    );

    // Payment methods
    response.addComponent(
        "checkoutPaymentMethods",
        "checkoutBillingAddressForm",
        getComponentSource("checkout/components/site/checkout/payment/paymentMethods.js"),
        {
            getMethodsAPI: buildSiteUrl("checkoutGetPaymentMethods")
        },
        100
    );

    // Summary block
    response.addComponent(
        "cartSummary",
        "shoppingCartRight",
        getComponentSource("checkout/components/site/cart/summary.js"),
        {
            checkoutUrl: buildSiteUrl("checkout")
        },
        10
    );
};
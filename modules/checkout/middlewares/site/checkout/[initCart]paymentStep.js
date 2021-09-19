const { buildSiteUrl } = require("../../../../../lib/routie");
const { assign } = require("../../../../../lib/util/assign");

module.exports = async (request, response, stack) => {
    //let cart = await stack["initCart"];
    let step = { id: "payment", title: "Payment", isCompleted: false, sortOrder: 15 };

    assign(response.context, {
        checkout: {
            steps: [step],
            setPaymentInfoAPI: buildSiteUrl("checkoutSetPaymentInfo"),
            setBillingAddressAPI: buildSiteUrl("checkoutSetBillingAddressInfo"),
            getPaymentMethodsAPI: buildSiteUrl("checkoutGetPaymentMethods"),
            placeOrderAPI: buildSiteUrl("checkoutPlaceOrder"),
            checkoutSuccessPage: buildSiteUrl("checkoutSuccess")
        }
    })
};
const { getComponentSource } = require("../../../../lib/helpers");

exports = module.exports = {
    "checkout": [
        {
            id: "stripePaymentForm",
            areaId: 'checkoutPaymentMethods',
            source: getComponentSource("stripe/components/site/checkout/PaymentFormContext.js"),
            props: {},
            sortOrder: 10
        }
    ]
}
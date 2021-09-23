const { getComponentSource } = require("../../../../lib/helpers");

exports = module.exports = {
    "checkout": [
        {
            id: "stripePaymentForm",
            areaId: 'checkoutPaymentMethods',
            source: getComponentSource("stripe/components/site/checkout/PaymentForm.js"),
            props: {},
            sortOrder: 10
        }
    ]
}
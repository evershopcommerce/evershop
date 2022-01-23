const { useSiteComponent } = require("../../../../lib/componee");

exports = module.exports = {
    "checkout": [
        {
            id: "stripePaymentForm",
            areaId: 'checkoutPaymentMethods',
            source: useSiteComponent("stripe/views/site/checkout/PaymentFormContext.js"),
            props: {},
            sortOrder: 10
        }
    ]
}
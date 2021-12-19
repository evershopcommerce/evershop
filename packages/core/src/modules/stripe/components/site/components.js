const { useSiteComponent } = require("../../../../lib/componee");

exports = module.exports = {
    "checkout": [
        {
            id: "stripePaymentForm",
            areaId: 'checkoutPaymentMethods',
            source: useSiteComponent("stripe/components/site/checkout/PaymentFormContext.js"),
            props: {},
            sortOrder: 10
        }
    ]
}
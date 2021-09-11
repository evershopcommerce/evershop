const { getComponentSource } = require("../../../../lib/helpers");
const { buildSiteUrl } = require("../../../../lib/routie");

exports = module.exports = {
    "*": [
        {
            id: "miniCart",
            areaId: "iconWrapper",
            source: getComponentSource("checkout/components/site/minicart.js"),
            props: {
                cartUrl: buildSiteUrl("cart"),
                checkoutUrl: buildSiteUrl("checkout")
            },
            sortOrder: 1
        }
    ],
    "cart": [
        {
            id: "shoppingCartLayout",
            areaId: "contentMiddle",
            source: getComponentSource("checkout/components/site/cart/layout.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "emptyCart",
            areaId: "shoppingCartTop",
            source: getComponentSource("checkout/components/site/cart/empty.js"),
            props: {
                homeUrl: buildSiteUrl("homepage")
            },
            sortOrder: 10
        },
        {
            id: "cartItems",
            areaId: "shoppingCartLeft",
            source: getComponentSource("checkout/components/site/cart/items.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "cartSummary",
            areaId: "shoppingCartRight",
            source: getComponentSource("checkout/components/site/cart/summary.js"),
            props: {
                checkoutUrl: buildSiteUrl("checkout")
            },
            sortOrder: 10
        }
    ],
    "checkout": [
        {
            id: "customerInfoStep",
            areaId: "checkoutSteps",
            source: getComponentSource("checkout/components/site/checkout/customerInfoStep.js"),
            props: {
                setContactInfoUrl: buildSiteUrl("checkoutSetContactInfo"),
                loginUrl: buildSiteUrl("customerLoginPost")
            },
            sortOrder: 5
        },
        {
            id: "checkoutPaymentStep",
            areaId: "checkoutSteps",
            source: getComponentSource("checkout/components/site/checkout/payment/paymentStep.js"),
            props: {},
            sortOrder: 15
        },
        {
            id: "checkoutShipmentStep",
            areaId: "checkoutSteps",
            source: getComponentSource("checkout/components/site/checkout/shipment/shipmentStep.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "checkoutPage",
            areaId: "contentMiddle",
            source: getComponentSource("checkout/components/site/checkout/checkout.js"),
            props: {},
            sortOrder: 0
        },
        {
            id: "checkoutShippingMethods",
            areaId: "checkoutShippingAddressForm",
            source: getComponentSource("checkout/components/site/checkout/shipment/shippingMethods.js"),
            props: {
                getMethodsAPI: buildSiteUrl("checkoutGetShippingMethods")
            },
            sortOrder: 100
        },
        {
            id: "checkoutPaymentMethods",
            areaId: "checkoutBillingAddressForm",
            source: getComponentSource("checkout/components/site/checkout/payment/paymentMethods.js"),
            props: {
                getMethodsAPI: buildSiteUrl("checkoutGetPaymentMethods")
            },
            sortOrder: 100
        },
        {
            id: "cartSummary",
            areaId: "shoppingCartRight",
            source: getComponentSource("checkout/components/site/cart/summary.js"),
            props: {
                checkoutUrl: buildSiteUrl("checkout")
            },
            sortOrder: 10
        }
    ],
    "checkoutSuccess": [
        {
            id: "checkoutSuccess",
            areaId: "contentMiddle",
            source: getComponentSource("checkout/components/site/checkoutSuccess/message.js"),
            props: {
                homepage: buildSiteUrl("homepage")
            },
            sortOrder: 10
        }
    ]
}
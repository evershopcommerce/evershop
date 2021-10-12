const { getComponentSource } = require("../../../../lib/helpers");
const { buildSiteUrl } = require("../../../../lib/routie");

exports = module.exports = {
    "*": [
        {
            id: "miniCart",
            areaId: "iconWrapper",
            source: getComponentSource("checkout/components/site/Minicart.js"),
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
            areaId: "content",
            source: getComponentSource("checkout/components/site/cart/Layout.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "emptyCart",
            areaId: "shoppingCartTop",
            source: getComponentSource("checkout/components/site/cart/Empty.js"),
            props: {
                homeUrl: buildSiteUrl("homepage")
            },
            sortOrder: 10
        },
        {
            id: "cartItems",
            areaId: "shoppingCartLeft",
            source: getComponentSource("checkout/components/site/cart/Items.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "cartSummary",
            areaId: "shoppingCartRight",
            source: getComponentSource("checkout/components/site/cart/Summary.js"),
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
            source: getComponentSource("checkout/components/site/checkout/CustomerInfoStep.js"),
            props: {
                setContactInfoUrl: buildSiteUrl("checkoutSetContactInfo"),
                loginUrl: buildSiteUrl("customerLoginPost")
            },
            sortOrder: 5
        },
        {
            id: "checkoutPaymentStep",
            areaId: "checkoutSteps",
            source: getComponentSource("checkout/components/site/checkout/payment/PaymentStep.js"),
            props: {},
            sortOrder: 15
        },
        {
            id: "checkoutShipmentStep",
            areaId: "checkoutSteps",
            source: getComponentSource("checkout/components/site/checkout/shipment/ShipmentStep.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "checkoutPage",
            areaId: "content",
            source: getComponentSource("checkout/components/site/checkout/Checkout.js"),
            props: {},
            sortOrder: 0
        },
        {
            id: "checkoutShippingMethods",
            areaId: "checkoutShippingAddressForm",
            source: getComponentSource("checkout/components/site/checkout/shipment/ShippingMethods.js"),
            props: {
                getMethodsAPI: buildSiteUrl("checkoutGetShippingMethods")
            },
            sortOrder: 100
        },
        {
            id: "checkoutPaymentMethods",
            areaId: "checkoutBillingAddressForm",
            source: getComponentSource("checkout/components/site/checkout/payment/PaymentMethods.js"),
            props: {
                getMethodsAPI: buildSiteUrl("checkoutGetPaymentMethods")
            },
            sortOrder: 100
        },
        {
            id: "cartSummary",
            areaId: "shoppingCartRight",
            source: getComponentSource("checkout/components/site/cart/Summary.js"),
            props: {
                checkoutUrl: buildSiteUrl("checkout")
            },
            sortOrder: 10
        }
    ],
    "checkoutSuccess": [
        {
            id: "checkoutSuccess",
            areaId: "content",
            source: getComponentSource("checkout/components/site/checkoutSuccess/CheckoutSuccess.js"),
            props: {
            },
            sortOrder: 10
        }
    ]
}
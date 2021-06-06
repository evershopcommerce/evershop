const config = require("config");
const { getComponentSource } = require("../../../../../lib/helpers");
const { buildSiteUrl } = require("../../../../../lib/routie");

module.exports = (request, response) => {
    // 2 columns layout block
    response.addComponent(
        "checkoutPageLayout",
        "contentMiddle",
        getComponentSource("checkout/components/site/checkout/layout.js"),
        {},
        10
    );

    // Shipping address form
    response.addComponent(
        "shippingAddressForm",
        "checkoutShippingAddressBlock",
        getComponentSource("checkout/components/site/checkout/address/new_shipping_address_form.js"),
        {
            "action": buildSiteUrl('checkoutSetShippingAddress'),
            "countries": config.get('checkout.allowCountries', ['US'])
        },
        10
    );

    // Items block
    response.addComponent(
        "cartItems",
        "shoppingCartLeft",
        getComponentSource("checkout/components/site/cart/items.js"),
        {},
        10
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
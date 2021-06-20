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
        "checkoutShippingAddressForm",
        "checkoutShippingAddressBlock",
        getComponentSource("checkout/components/site/checkout/address/newShippingAddressForm.js"),
        {
            "action": buildSiteUrl('checkoutSetShippingAddress'),
            "countries": config.get('checkout.allowCountries', ['US'])
        },
        10
    );

    // Billing address form
    response.addComponent(
        "checkoutBillingAddressForm",
        "checkoutBillingAddressBlock",
        getComponentSource("checkout/components/site/checkout/address/newBillingAddressForm.js"),
        {
            "action": buildSiteUrl('checkoutSetBillingAddress'),
            "countries": config.get('checkout.allowCountries', ['US'])
        },
        30
    );
    response.addComponent(
        "checkoutUseShippingAddressCheckbox",
        "checkoutBillingAddressBlock",
        getComponentSource("checkout/components/site/checkout/address/useShippingAddress.js"),
        {
            "action": buildSiteUrl('checkoutSetBillingAddress')
        },
        20
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
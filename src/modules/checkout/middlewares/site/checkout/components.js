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
        getComponentSource("checkout/components/site/checkout/address/new_shipping_address_form.js"),
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
        getComponentSource("checkout/components/site/checkout/address/new_billing_address_form.js"),
        {
            "action": buildSiteUrl('checkoutSetBillingAddress'),
            "countries": config.get('checkout.allowCountries', ['US'])
        },
        30
    );
    response.addComponent(
        "checkoutUseShippingAddressCheckbox",
        "checkoutBillingAddressBlock",
        getComponentSource("checkout/components/site/checkout/address/use_shipping_address.js"),
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
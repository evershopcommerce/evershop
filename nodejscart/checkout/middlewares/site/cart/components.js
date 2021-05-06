const { getComponentSource } = require("../../../../../lib/util");
const { buildSiteUrl } = require("../../../../../lib/routie");

module.exports = (request, response) => {
    // 2 columns layout block
    response.addComponent(
        "shoppingCartLayout",
        "contentMiddle",
        getComponentSource("checkout/components/site/cart/layout.js"),
        {},
        10
    );

    // Empty cart block
    response.addComponent(
        "emptyCart",
        "shoppingCartTop",
        getComponentSource("checkout/components/site/cart/empty.js"),
        {
            homeUrl: buildSiteUrl("homepage")
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
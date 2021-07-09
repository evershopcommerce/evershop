const { buildSiteUrl } = require("../../../../../lib/routie");
const { getComponentSource } = require("../../../../../lib/helpers");

module.exports = (request, response) => {
    // 2 columns layout block
    response.addComponent(
        "miniCart",
        "header",
        getComponentSource("checkout/components/site/minicart.js"),
        {
            cartUrl: buildSiteUrl("cart"),
            checkoutUrl: buildSiteUrl("checkout")
        },
        5
    );
};
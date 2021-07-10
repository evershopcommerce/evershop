const { getComponentSource } = require("../../../../lib/helpers");
const { buildSiteUrl } = require("../../../../lib/routie");

exports = module.exports = {
    "*": [
        {
            id: "miniCart",
            areaId: "header",
            source: getComponentSource("checkout/components/site/minicart.js"),
            props: {
                cartUrl: buildSiteUrl("cart"),
                checkoutUrl: buildSiteUrl("checkout")
            },
            sortOrder: 1
        }
    ]
}
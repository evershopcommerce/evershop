const { buildSiteUrl } = require("../../../../../lib/routie");
const { getComponentSource } = require("../../../../../lib/util");

module.exports = (request, response) => {
    // 2 columns layout block
    response.addComponent(
        "productLayout",
        "contentMiddle",
        getComponentSource("catalog/components/site/product/view/layout.js"),
        {},
        10
    );

    // Add to cart block
    response.addComponent(
        "productForm",
        "productPageMiddleRight",
        getComponentSource("catalog/components/site/product/view/form.js"),
        {
            action: buildSiteUrl("addToCart")
        },
        50
    );

    // General info block
    response.addComponent(
        "productGeneralInfo",
        "productPageMiddleRight",
        getComponentSource("catalog/components/site/product/view/general_info.js"),
        {},
        10
    );

    // Images block
    response.addComponent(
        "productImages",
        "productPageMiddleLeft",
        getComponentSource("catalog/components/site/product/view/images.js"),
        {},
        10
    );

    // Description block
    response.addComponent(
        "productDescription",
        "productPageBottom",
        getComponentSource("catalog/components/site/product/view/description.js"),
        {},
        10
    );
};
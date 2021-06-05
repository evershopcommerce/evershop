const { getComponentSource } = require("../../../../../lib/helpers");

module.exports = (request, response) => {
    // General block
    response.addComponent(
        "categoryGeneral",
        "contentTop",
        getComponentSource("catalog/components/site/category/view/general.js"),
        {},
        10
    );

    // Attribute block
    response.addComponent("products", "contentMiddle", getComponentSource("catalog/components/site/category/view/products.js"), {}, 10);
};
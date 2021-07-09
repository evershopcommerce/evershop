const { getComponentSource } = require("../../../../../lib/helpers");
const { get } = require("../../../../../lib/util/get");
const { buildAdminUrl } = require("../../../../../lib/routie");

module.exports = async (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("actionHeader", "productGridHeader", getComponentSource("grid/headers/action.js"), { "gridOriginalUrl": buildAdminUrl("productGrid") }, 35);
    response.addComponent("actionRow", "productGridRow", getComponentSource("grid/rows/action.js"), { "id": "action" }, 35);

    await stack["grid"];

    let products = get(response.context, "grid.products", []);
    products.forEach(function (el, index) {
        this[index]["editUrl"] = buildAdminUrl("productEdit", { id: parseInt(this[index]["product_id"]) });
        this[index]["deleteUrl"] = buildAdminUrl("productEdit", { id: parseInt(this[index]["product_id"]) });
    }, products);
}
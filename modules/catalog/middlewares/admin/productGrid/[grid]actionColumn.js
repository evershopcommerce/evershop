const { get } = require("../../../../../lib/util/get");
const { buildAdminUrl } = require("../../../../../lib/routie");

module.exports = async (request, response, stack) => {
    await stack["grid"];

    let products = get(response.context, "grid.products", []);
    products.forEach(function (el, index) {
        this[index]["editUrl"] = buildAdminUrl("productEdit", { id: parseInt(this[index]["product_id"]) });
        this[index]["deleteUrl"] = buildAdminUrl("productEdit", { id: parseInt(this[index]["product_id"]) });
    }, products);
}
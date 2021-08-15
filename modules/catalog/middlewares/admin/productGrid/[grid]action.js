const { get } = require("../../../../../lib/util/get");
const { buildAdminUrl } = require("../../../../../lib/routie");
const { assign } = require("../../../../../lib/util/assign");

module.exports = async (request, response, stack) => {
    await stack["grid"];

    let products = get(response.context, "grid.products", []);
    products.forEach(function (el, index) {
        this[index]["editUrl"] = buildAdminUrl("productEdit", { id: parseInt(this[index]["product_id"]) });//TODO: This should be a part of the name column
        this[index]["deleteUrl"] = buildAdminUrl("productEdit", { id: parseInt(this[index]["product_id"]) });
    }, products);

    assign(response.context, { deleteProductsUrl: buildAdminUrl("productBulkDelete") });
    assign(response.context, { enableProductsUrl: buildAdminUrl("productBulkEnable") });
    assign(response.context, { disableProductUrl: buildAdminUrl("productBulkDisable") });
}
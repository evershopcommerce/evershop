const { get } = require("../../../../../lib/util/get");
const { buildAdminUrl } = require("../../../../../lib/routie");
const { assign } = require("../../../../../lib/util/assign");

module.exports = async (request, response, stack) => {
    await stack["grid"];

    let categories = get(response.context, "grid.categories", []);
    categories.forEach(function (el, index) {
        this[index]["editUrl"] = buildAdminUrl("categoryEdit", { id: parseInt(this[index]["category_id"]) });
        this[index]["deleteUrl"] = buildAdminUrl("categoryEdit", { id: parseInt(this[index]["category_id"]) });
    }, categories);

    assign(response.context, { deleteCategoriesUrl: buildAdminUrl("categoryBulkDelete") });
}
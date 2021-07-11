const { get } = require("../../../../../lib/util/get");
const { buildAdminUrl } = require("../../../../../lib/routie");

module.exports = async (request, response, stack) => {
    await stack["grid"];

    let categories = get(response.context, "grid.categories", []);
    categories.forEach(function (el, index) {
        this[index]["editUrl"] = buildAdminUrl("categoryEdit", { id: parseInt(this[index]["category_id"]) });
        this[index]["deleteUrl"] = buildAdminUrl("categoryEdit", { id: parseInt(this[index]["category_id"]) });
    }, categories);
}
const { get } = require("../../../../../lib/util/get");
const { buildAdminUrl } = require("../../../../../lib/routie");
const { assign } = require("../../../../../lib/util/assign");

module.exports = async (request, response, stack) => {
    await stack["grid"];

    let attributes = get(response.context, "grid.attributes", []);
    attributes.forEach(function (el, index) {
        this[index]["editUrl"] = buildAdminUrl("attributeEdit", { id: parseInt(this[index]["attribute_id"]) });
        this[index]["deleteUrl"] = buildAdminUrl("attributeEdit", { id: parseInt(this[index]["attribute_id"]) });
    }, attributes);

    assign(response.context, { deleteAttributesUrl: buildAdminUrl("attributeBulkDelete") });
}
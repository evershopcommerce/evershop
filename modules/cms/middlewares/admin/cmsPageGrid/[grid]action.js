const { get } = require("../../../../../lib/util/get");
const { buildAdminUrl } = require("../../../../../lib/routie");
const { assign } = require("../../../../../lib/util/assign");

module.exports = async (request, response, stack) => {
    await stack["grid"];

    let pages = get(response.context, "grid.pages", []);
    pages.forEach(function (el, index) {
        this[index]["editUrl"] = buildAdminUrl("cmsPageEdit", { id: parseInt(this[index]["cms_page_id"]) });
    }, pages);

    //assign(response.context, { deleteCmsPagesUrl: buildAdminUrl("cmsPageBulkDelete") });
}
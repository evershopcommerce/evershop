const { get } = require("../../../../../lib/util/get");
const { buildAdminUrl } = require("../../../../../lib/routie");

module.exports = async (request, response, stack) => {
    await stack["grid"];

    let pages = get(response.context, "grid.pages", []);
    pages.forEach(function (el, index) {
        this[index]["editUrl"] = buildAdminUrl("cmsPageEdit", { id: parseInt(this[index]["cms_page_id"]) });
        this[index]["deleteUrl"] = buildAdminUrl("cmsPageEdit", { id: parseInt(this[index]["cms_page_id"]) });
    }, pages);
}
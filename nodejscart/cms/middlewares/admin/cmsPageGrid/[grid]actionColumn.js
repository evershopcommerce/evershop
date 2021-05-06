const { getComponentSource } = require("../../../../../lib/util");
import { get } from "../../../../../lib/util/get";
import { buildAdminUrl } from "../../../../../lib/routie";

module.exports = async (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("actionHeader", "pageGridHeader", getComponentSource("grid/headers/action.js"), { "gridOriginalUrl": buildAdminUrl("cmsPageGrid") }, 35);
    response.addComponent("actionRow", "pageGridRow", getComponentSource("grid/rows/action.js"), { "id": "action" }, 35);

    await stack["grid"];

    let pages = get(response.context, "grid.pages", []);
    pages.forEach(function (el, index) {
        this[index]["editUrl"] = buildAdminUrl("cmsPageEdit", { id: parseInt(this[index]["cms_page_id"]) });
        this[index]["deleteUrl"] = buildAdminUrl("cmsPageEdit", { id: parseInt(this[index]["cms_page_id"]) });
    }, pages);
}
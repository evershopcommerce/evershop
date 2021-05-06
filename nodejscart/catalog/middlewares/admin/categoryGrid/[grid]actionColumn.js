const { getComponentSource } = require("../../../../../lib/util");
import { get } from "../../../../../lib/util/get";
import { buildAdminUrl } from "../../../../../lib/routie";

module.exports = async (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("actionHeader", "categoryGridHeader", getComponentSource("grid/headers/action.js"), { "gridOriginalUrl": buildAdminUrl("categoryGrid") }, 35);
    response.addComponent("actionRow", "categoryGridRow", getComponentSource("grid/rows/action.js"), { "id": "action" }, 35);

    await stack["grid"];

    let categories = get(response.context, "grid.categories", []);
    categories.forEach(function (el, index) {
        this[index]["editUrl"] = buildAdminUrl("categoryEdit", { id: parseInt(this[index]["category_id"]) });
        this[index]["deleteUrl"] = buildAdminUrl("categoryEdit", { id: parseInt(this[index]["category_id"]) });
    }, categories);
}
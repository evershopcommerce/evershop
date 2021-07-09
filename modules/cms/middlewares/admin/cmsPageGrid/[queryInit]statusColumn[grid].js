const { getComponentSource } = require("../../../../../lib/helpers");
const { assign } = require("../../../../../lib/util/assign");

module.exports = (request, response, stack) => {
    // Add name column to the grid
    response.addComponent("statusColumn", "pageGridHeader", getComponentSource("grid/headers/status.js"), { "title": "Status", "id": "status" }, 25);
    response.addComponent("statusRow", "pageGridRow", getComponentSource("grid/rows/status.js"), { "id": "status" }, 25);

    // Handle filter
    if (parseInt(request.query["status"]) === 0 || parseInt(request.query["status"]) === 1) {
        let query = stack["queryInit"];
        query.andWhere("cms_page.`status`", "=", parseInt(request.query["status"]));
        assign(response.context, { grid: { currentFilter: { status: parseInt(request.query["status"]) } } });
    }
}
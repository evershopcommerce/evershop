const { buildAdminUrl } = require("../../../../../lib/routie");
const { getComponentSource } = require("../../../../../lib/util")

module.exports = function (request, response) {
    [
        {
            id: "statistic",
            areaId: 'left.side',
            source: getComponentSource("sale/components/admin/dashboard/statistic.js", true),
            props: { api: buildAdminUrl("salestatistic", { "period": "daily" }) },
            sortOrder: 10
        }
    ].forEach((e) => {
        response.addComponent(e.id, e.areaId, e.source, e.props, e.sortOrder);
    })
}
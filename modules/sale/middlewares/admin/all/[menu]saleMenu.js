const { buildAdminUrl } = require("../../../../../lib/routie");
const { getComponentSource } = require("../../../../../lib/helpers");

module.exports = function (request, response) {
    [
        {
            id: "sale.group",
            areaId: 'admin.menu',
            "source": getComponentSource("cms/components/admin/navigationItemGroup.js", true),
            props: { id: 'sale.group', name: 'Sale' },
            "sortOrder": 20
        },
        {
            id: "orders",
            areaId: 'sale.group',
            source: getComponentSource("cms/components/admin/navigationItem.js", true),
            props: {
                "icon": "shopping-bag",
                "url": buildAdminUrl("orderGrid"),
                "title": "Orders"
            },
            sortOrder: 5
        }
    ].forEach((e) => {
        response.addComponent(e.id, e.areaId, e.source, e.props, e.sortOrder);
    })
}
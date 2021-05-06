const { buildAdminUrl } = require("../../../../../lib/routie");
const { getComponentSource } = require("../../../../../lib/util");

module.exports = function (request, response) {
    [
        {
            id: "catalog.group",
            areaId: 'admin.menu',
            "source": getComponentSource("cms/components/admin/navigationItemGroup.js", true),
            props: { id: 'catalog.group', name: 'Catalog' },
            "sortOrder": 10
        },
        {
            id: "new.product",
            areaId: 'quick.links',
            source: getComponentSource("cms/components/admin/navigationItem.js", true),
            props: {
                "icon": "cubes",
                "url": buildAdminUrl("productNew"),
                "title": "New Product"
            },
            sortOrder: 5
        },
        {
            id: "products",
            areaId: 'catalog.group',
            source: getComponentSource("cms/components/admin/navigationItem.js", true),
            props: {
                "icon": "boxes",
                "url": buildAdminUrl("productGrid"),
                "title": "Products"
            },
            sortOrder: 5
        },
        {
            id: "categories",
            areaId: 'catalog.group',
            source: getComponentSource("cms/components/admin/navigationItem.js", true),
            props: {
                "icon": "tags",
                "url": buildAdminUrl("categoryGrid"),
                "title": "Categories"
            },
            sortOrder: 10
        }
    ].forEach((e) => {
        response.addComponent(e.id, e.areaId, e.source, e.props, e.sortOrder);
    })
}
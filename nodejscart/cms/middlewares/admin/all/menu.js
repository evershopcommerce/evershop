const { buildAdminUrl } = require("../../../../../lib/routie");
const { getComponentSource } = require("../../../../../lib/util");

module.exports = function (request, response) {
    [{
        id: "navigation",
        areaId: 'admin.navigation',
        "source": getComponentSource("cms/components/admin/navigation.js", true),
        "sortOrder": 0
    },
    {
        id: "quick.link.group",
        areaId: 'admin.menu',
        "source": getComponentSource("cms/components/admin/navigationItemGroup.js", true),
        props: { id: 'quick.links', name: 'Quick Links' },
        "sortOrder": 0
    },
    {
        id: "cms.group",
        areaId: 'admin.menu',
        source: getComponentSource("cms/components/admin/navigationItemGroup.js", true),
        props: { id: 'cms.links', name: 'CMS' },
        sortOrder: 30
    },
    {
        id: "dashboard",
        areaId: 'quick.links',
        source: getComponentSource("cms/components/admin/navigationItem.js", true),
        props: {
            "icon": "home",
            "url": buildAdminUrl("dashboard"),
            "title": "Dashboard"
        },
        sortOrder: 5
    },
    {
        id: "pages",
        areaId: 'cms.links',
        source: getComponentSource("cms/components/admin/navigationItem.js", true),
        props: {
            "icon": "file-alt",
            "url": buildAdminUrl("cmsPageGrid"),
            "title": "Pages"
        },
        sortOrder: 5
    }].forEach((e) => {
        response.addComponent(e.id, e.areaId, e.source, e.props, e.sortOrder);
    })
}
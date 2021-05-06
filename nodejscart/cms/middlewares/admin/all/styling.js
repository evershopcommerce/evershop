const { getComponentSource, getAdminCssFile } = require("../../../../../lib/util");
const { buildAdminUrl } = require("../../../../../lib/routie");

module.exports = function (request, response) {
    [{
        id: "fontawesome",
        areaId: 'head',
        source: getComponentSource("link.js", true),
        props: {
            "href": buildAdminUrl("adminStaticAsset", [getAdminCssFile('fontawesome/css/all.min.css').replace("/", "")]),
            "rel": "stylesheet"
        },
        sortOrder: 1
    },
    {
        id: "bootstrap",
        areaId: 'head',
        source: getComponentSource("link.js", true),
        props: {
            "href": buildAdminUrl("adminStaticAsset", [getAdminCssFile('bootstrap.css').replace("/", "")]),
            "rel": "stylesheet"
        },
        sortOrder: 2
    },
    {
        id: "style",
        areaId: 'head',
        source: getComponentSource("link.js", true),
        props: {
            "href": buildAdminUrl("adminStaticAsset", [getAdminCssFile('style.css').replace("/", "")]),
            "rel": "stylesheet"
        },
        sortOrder: 3
    }].forEach((e) => {
        response.addComponent(e.id, e.areaId, e.source, e.props, e.sortOrder);
    })
}
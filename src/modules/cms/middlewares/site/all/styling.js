const { getComponentSource, getSiteCssFile } = require("../../../../../lib/helpers");
const { buildSiteUrl } = require("../../../../../lib/routie");

module.exports = function (request, response) {
    [
        //     {
        //     id: "fontawesome",
        //     areaId: 'head',
        //     source: getComponentSource("link.js", true),
        //     props: {
        //         "href": getSiteCssFile('fontawesome/css/all.min.css'),
        //         "rel": "stylesheet"
        //     },
        //     sortOrder: 1
        // },
        {
            id: "viewport",
            areaId: 'head',
            source: getComponentSource("meta.js", true),
            props: {
                "name": "viewport",
                "content": "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, user-scalable=1"
            },
            sortOrder: 2
        },
        {
            id: "bootstrap",
            areaId: 'head',
            source: getComponentSource("link.js", true),
            props: {
                "href": buildSiteUrl("staticAsset", [getSiteCssFile('bootstrap.css').replace("/", "")]),
                "rel": "stylesheet"
            },
            sortOrder: 2
        },
        {
            id: "style",
            areaId: 'head',
            source: getComponentSource("link.js", true),
            props: {
                "href": buildSiteUrl("staticAsset", [getSiteCssFile('style.css').replace("/", "")]),
                "rel": "stylesheet"
            },
            sortOrder: 3
        }].forEach((e) => {
            response.addComponent(e.id, e.areaId, e.source, e.props, e.sortOrder);
        })
}
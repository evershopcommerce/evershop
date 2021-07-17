const { getComponentSource, getSiteCssFile } = require("../../../../lib/helpers");
const { buildSiteUrl } = require("../../../../lib/routie");

exports = module.exports = {
    "*": [
        {
            id: "notification",
            areaId: "body",
            source: getComponentSource("notification.js", true),
            props: {},
            sortOrder: 1
        },
        {
            id: "layout",
            areaId: "body",
            source: getComponentSource("cms/components/site/layout.js", true),
            props: {},
            sortOrder: 1
        },
        {
            id: "menu",
            areaId: "header",
            source: getComponentSource("cms/components/site/menu.js", true),
            props: {},
            sortOrder: 10
        },
        {
            id: "metaTitle",
            areaId: "head",
            source: getComponentSource("cms/components/site/metaTitle.js", true),
            props: {},
            sortOrder: 1
        },
        {
            id: "metaDescription",
            areaId: "head",
            source: getComponentSource("cms/components/site/metaDescription.js", true),
            props: {},
            sortOrder: 1
        }

        ,
        {
            id: "viewport",
            areaId: "head",
            source: getComponentSource("meta.js", true),
            props: {
                "name": "viewport",
                "content": "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, user-scalable=1"
            },
            sortOrder: 2
        },
        {
            id: "bootstrap",
            areaId: "head",
            source: getComponentSource("link.js", true),
            props: {
                "href": buildSiteUrl("staticAsset", [getSiteCssFile('bootstrap.css').replace("/", "")]),
                "rel": "stylesheet"
            },
            sortOrder: 2
        },
        {
            id: "bundleCSS",
            areaId: "head",
            source: getComponentSource("cms/components/bundleCss.js", true),
            props: {},
            sortOrder: 10
        },
        {
            id: "bundleJS",
            areaId: "after.body",
            source: getComponentSource("cms/components/bundleJs.js", true),
            props: {},
            sortOrder: 10
        }
    ]
}
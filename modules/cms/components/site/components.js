const { getComponentSource, getSiteCssFile } = require("../../../../lib/helpers");
const { buildSiteUrl } = require("../../../../lib/routie");

exports = module.exports = {
    "*": [
        {
            id: "notification",
            areaId: "body",
            source: getComponentSource("cms/components/site/notification.js", true),
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
            id: "logo",
            areaId: "header",
            source: getComponentSource("cms/components/site/Logo.js", true),
            props: {
                homeUrl: buildSiteUrl("homepage")
            },
            sortOrder: 0
        },
        {
            id: "menu",
            areaId: "header",
            source: getComponentSource("cms/components/site/menu.js", true),
            props: {},
            sortOrder: 10
        },
        {
            id: "iconWrapper",
            areaId: "header",
            source: getComponentSource("Area.js", true),
            props: {
                id: 'iconWrapper',
                className: 'icon-wrapper flex justify-between space-x-1'
            },
            sortOrder: 20
        },
        {
            id: "mobileMenu",
            areaId: "iconWrapper",
            source: getComponentSource("cms/components/site/MobileMenu.js", true),
            props: {},
            sortOrder: 20
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
                "content": "width=device-width, initial-scale=1"
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
    ],
    "homepage": [
        {
            id: "mainBanner",
            areaId: "content",
            source: getComponentSource("cms/components/site/homepage/MainBanner.js"),
            props: {},
            sortOrder: 10
        }
    ]
}
const { useSiteComponent, useComponent } = require("../../../../lib/componee");
const { buildSiteUrl } = require("../../../../lib/routie");

exports = module.exports = {
    "*": [
        {
            id: "notification",
            areaId: "body",
            source: useSiteComponent("cms/components/site/Notification.js"),
            props: {},
            sortOrder: 1
        },
        {
            id: "layout",
            areaId: "body",
            source: useSiteComponent("cms/components/site/Layout.js"),
            props: {},
            sortOrder: 1
        },
        {
            id: "logo",
            areaId: "header",
            source: useSiteComponent("cms/components/site/Logo.js"),
            props: {
                homeUrl: buildSiteUrl("homepage")
            },
            sortOrder: 0
        },
        {
            id: "menu",
            areaId: "header",
            source: useSiteComponent("cms/components/site/Menu.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "iconWrapper",
            areaId: "header",
            source: useComponent("Area.js"),
            props: {
                id: 'iconWrapper',
                className: 'icon-wrapper flex justify-between space-x-1'
            },
            sortOrder: 20
        },
        {
            id: "mobileMenu",
            areaId: "iconWrapper",
            source: useSiteComponent("cms/components/site/MobileMenu.js"),
            props: {},
            sortOrder: 20
        },
        {
            id: "metaTitle",
            areaId: "head",
            source: useSiteComponent("cms/components/site/MetaTitle.js"),
            props: {},
            sortOrder: 1
        },
        {
            id: "metaDescription",
            areaId: "head",
            source: useSiteComponent("cms/components/site/MetaDescription.js"),
            props: {},
            sortOrder: 1
        }

        ,
        {
            id: "viewport",
            areaId: "head",
            source: useComponent("Meta.js"),
            props: {
                "name": "viewport",
                "content": "width=device-width, initial-scale=1"
            },
            sortOrder: 2
        },
        {
            id: "bundleCSS",
            areaId: "head",
            source: useComponent("BundleCss.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "bundleJS",
            areaId: "after.body",
            source: useComponent("BundleJs.js"),
            props: {},
            sortOrder: 10
        }
    ],
    "homepage": [
        {
            id: "mainBanner",
            areaId: "content",
            source: useSiteComponent("cms/components/site/homepage/MainBanner.js"),
            props: {},
            sortOrder: 10
        }
    ]
}
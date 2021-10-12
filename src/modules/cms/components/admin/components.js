const { getComponentSource, getAdminCssFile } = require("../../../../lib/helpers");
const { buildAdminUrl } = require("../../../../lib/routie");

exports = module.exports = {
    "*": [
        {
            id: "layout",
            areaId: "body",
            source: getComponentSource("cms/components/admin/Layout.js", true),
            props: {},
            sortOrder: 1
        },
        {
            id: "logo",
            areaId: 'header',
            source: getComponentSource("cms/components/admin/dashboard/Logo.js"),
            props: {
                dashboardUrl: buildAdminUrl('dashboard')
            },
            sortOrder: 10
        },
        {
            id: "searchBox",
            areaId: 'header',
            source: getComponentSource("cms/components/admin/dashboard/SearchBox.js"),
            props: {
                searchAPI: buildAdminUrl('search'),
                resourceLinks: [
                    {
                        url: buildAdminUrl('productGrid'),
                        name: "Products"
                    },
                    {
                        url: buildAdminUrl('orderGrid'),
                        name: "Orders"
                    }
                ]
            },
            sortOrder: 20
        },
        {
            id: "notification",
            areaId: "body",
            source: getComponentSource("Notification.js", true),
            props: {},
            sortOrder: 1
        },
        {
            id: "navigation",
            areaId: "admin.navigation",
            source: getComponentSource("cms/components/admin/Navigation.js", true),
            props: {},
            sortOrder: 0
        },
        {
            id: "quick.link.group",
            areaId: "admin.menu",
            source: getComponentSource("cms/components/admin/NavigationItemGroup.js", true),
            props: {
                id: 'quick.links',
                name: 'Quick Links'
            },
            sortOrder: 0
        },
        {
            id: "cms.group",
            areaId: "admin.menu",
            source: getComponentSource("cms/components/admin/NavigationItemGroup.js", true),
            props: {
                id: 'cms.links',
                name: 'CMS'
            },
            sortOrder: 30
        },
        {
            id: "dashboard",
            areaId: "quick.links",
            source: getComponentSource("cms/components/admin/NavigationItem.js", true),
            props: {
                "icon": "home",
                "url": buildAdminUrl("dashboard"),
                "title": "Dashboard"
            },
            sortOrder: 5
        },
        {
            id: "pages",
            areaId: "cms.links",
            source: getComponentSource("cms/components/admin/NavigationItem.js", true),
            props: {
                "icon": "file-alt",
                "url": buildAdminUrl("cmsPageGrid"),
                "title": "Pages"
            },
            sortOrder: 5
        },
        {
            id: "bundleJS",
            areaId: "after.body",
            source: getComponentSource("cms/components/BundleJs.js", true),
            props: {},
            sortOrder: 10
        },
        /** Styling */
        {
            id: "fontawesome",
            areaId: 'head',
            source: getComponentSource("Link.js", true),
            props: {
                "href": buildAdminUrl("adminStaticAsset", [getAdminCssFile('fontawesome/css/all.min.css').replace("/", "")]),
                "rel": "stylesheet"
            },
            sortOrder: 1
        },
        {
            id: "bundleCss",
            areaId: "head",
            source: getComponentSource("cms/components/BundleCss.js", true),
            props: {},
            sortOrder: 10
        }
    ],
    "cmsPageEdit": [
        {
            id: "metaTitle",
            areaId: 'content',
            source: getComponentSource("Title.js"),
            props: {
                title: "Edit page"
            },
            sortOrder: 1
        }
    ],
    "cmsPageNew": [
        {
            id: "metaTitle",
            areaId: 'content',
            source: getComponentSource("Title.js"),
            props: {
                title: "Create a new page"
            },
            sortOrder: 1
        }
    ],
    "cmsPageNew+cmsPageEdit": [
        {
            id: "pageHeading",
            areaId: "content",
            source: getComponentSource("cms/components/admin/PageHeading.js"),
            props: {
                backUrl: buildAdminUrl('cmsPageGrid')
            },
            sortOrder: 10
        },
        {
            id: "createForm",
            areaId: 'content',
            source: getComponentSource("cms/components/admin/page/edit/PageEditForm.js"),
            props: {
                id: "page-edit-form",
                method: "POST",
                action: buildAdminUrl("cmsPageSavePost"),
                gridUrl: buildAdminUrl("cmsPageGrid"),
                uploadApi: buildAdminUrl("imageUpload", [""])
            },
            sortOrder: 10
        },
        {
            id: "pageEditGeneral",
            areaId: 'leftSide',
            source: getComponentSource("cms/components/admin/page/edit/General.js"),
            props: {
                browserApi: buildAdminUrl("fileBrowser", [""]),
                deleteApi: buildAdminUrl("fileDelete", [""]),
                uploadApi: buildAdminUrl("imageUpload", [""]),
                folderCreateApi: buildAdminUrl("folderCreate", [""])
            },
            sortOrder: 10
        },
        {
            id: 'pageEditSEO',
            areaId: 'rightSide',
            source: getComponentSource("cms/components/admin/page/edit/Seo.js"),
            props: {},
            sortOrder: 20
        },
        {
            id: "ckeditor",
            areaId: 'head',
            source: getComponentSource("Script.js", true),
            props: {
                src: buildAdminUrl("adminStaticAsset", ['admin/default/js/ckeditor4/Ckeditor.js']),
            },
            sortOrder: 1
        }
    ],
    "cmsPageGrid": [
        {
            id: "pageGrid",
            areaId: 'content',
            source: getComponentSource("cms/components/admin/page/grid/Grid.js"),
            props: {
                limit: 20
            },
            sortOrder: 20
        },
        {
            id: "pageHeading",
            areaId: "content",
            source: getComponentSource("cms/components/admin/PageHeading.js"),
            props: {
            },
            sortOrder: 10
        },
        {
            id: "newCMSPageButton",
            areaId: "pageHeadingRight",
            source: getComponentSource("form/Button.js"),
            props: {
                title: 'Add a page',
                variant: 'primary',
                url: buildAdminUrl('cmsPageNew')
            },
            sortOrder: 10
        },
        {
            id: 'title',
            areaId: 'head',
            source: getComponentSource("Title.js", true),
            props: {
                title: "Pages"
            },
            sortOrder: 1
        },
        {
            id: 'statusColumn',
            areaId: 'pageGridHeader',
            source: getComponentSource("grid/headers/Status.js"),
            props: {
                title: "Status",
                id: "status"
            },
            sortOrder: 25
        },
        {
            id: 'statusRow',
            areaId: 'pageGridRow',
            source: getComponentSource("grid/rows/Status.js"),
            props: {
                id: "status"
            },
            sortOrder: 25
        },
        {
            id: 'nameColumn',
            areaId: 'pageGridHeader',
            source: getComponentSource("grid/headers/Basic.js"),
            props: {
                title: "Page name",
                id: "name"
            },
            sortOrder: 5
        },
        {
            id: 'nameRow',
            areaId: 'pageGridRow',
            source: getComponentSource("cms/components/admin/page/grid/NameRow.js"),
            props: {
                id: "name",
                editUrl: 'editUrl'
            },
            sortOrder: 5
        }
    ],
    "dashboard": [
        {
            id: "layout",
            areaId: 'content',
            source: getComponentSource("cms/components/admin/dashboard/Layout.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "pageHeading",
            areaId: "content",
            source: getComponentSource("cms/components/admin/PageHeading.js"),
            props: {
            },
            sortOrder: 5
        },
        {
            id: 'title',
            areaId: 'head',
            source: getComponentSource("Title.js", true),
            props: {
                title: "Dashboard"
            },
            sortOrder: 1
        }
    ]
}
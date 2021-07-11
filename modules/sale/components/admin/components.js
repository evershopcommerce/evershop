const { getComponentSource, getAdminCssFile, getAdminJsFile } = require("../../../../lib/helpers");
const { buildAdminUrl } = require("../../../../lib/routie");

exports = module.exports = {
    "*": [
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
    ],
    "orderEdit": [
        {
            id: "metaTitle",
            areaId: 'content',
            source: getComponentSource("title.js"),
            props: {
                title: "Edit order"
            },
            sortOrder: 1
        },
        {
            id: "title",
            areaId: 'content',
            source: getComponentSource("cms/components/admin/title.js", true),
            props: {
                title: "Edit order"
            },
            sortOrder: 1
        },
        {
            id: "orderEditLayout",
            areaId: 'content',
            source: getComponentSource("sale/components/admin/order/edit/layout.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "general",
            areaId: 'leftSide',
            source: getComponentSource("sale/components/admin/order/edit/general.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "shipment",
            areaId: 'leftSide',
            source: getComponentSource("sale/components/admin/order/edit/shipment.js"),
            props: {},
            sortOrder: 20
        },
        {
            id: "payment",
            areaId: 'leftSide',
            source: getComponentSource("sale/components/admin/order/edit/payment.js"),
            props: {},
            sortOrder: 30
        },
        {
            id: "items",
            areaId: 'leftSide',
            source: getComponentSource("sale/components/admin/order/edit/items.js"),
            props: {},
            sortOrder: 40
        },
        {
            id: "summary",
            areaId: 'leftSide',
            source: getComponentSource("sale/components/admin/order/edit/summary.js"),
            props: {},
            sortOrder: 50
        }
    ],
    "orderGrid": [
        {
            id: "orderGrid",
            areaId: 'content',
            source: getComponentSource("sale/components/admin/order/grid/grid.js"),
            props: {
                limit: 20
            },
            sortOrder: 10
        },
        {
            id: 'title',
            areaId: 'content',
            source: getComponentSource("cms/components/admin/title.js"),
            props: {
                title: "Orders"
            },
            sortOrder: 1
        },
        {
            id: 'title',
            areaId: 'head',
            source: getComponentSource("title.js", true),
            props: {
                title: "Orders"
            },
            sortOrder: 1
        },
        {
            id: 'shipmentStatusColumn',
            areaId: 'orderGridHeader',
            source: getComponentSource("grid/headers/status.js"),
            props: {
                title: "Shipment status",
                id: "shipment_status"
            },
            sortOrder: 25
        },
        {
            id: 'shipmentStatusRow',
            areaId: 'orderGridRow',
            source: getComponentSource("sale/components/admin/order/grid/shipmentStatus.js"),
            props: {
                id: "shipment_status"
            },
            sortOrder: 25
        },
        {
            id: 'nameColumn',
            areaId: 'orderGridHeader',
            source: getComponentSource("grid/headers/basic.js"),
            props: {
                title: "Customer name",
                id: "customer_name"
            },
            sortOrder: 5
        },
        {
            id: 'nameRow',
            areaId: 'orderGridRow',
            source: getComponentSource("grid/rows/basic.js"),
            props: {
                id: "customer_name"
            },
            sortOrder: 5
        },
        {
            id: 'idColumn',
            areaId: 'orderGridHeader',
            source: getComponentSource("grid/headers/fromTo.js"),
            props: {
                title: "ID",
                id: "order_id"
            },
            sortOrder: 1
        },
        {
            id: 'idRow',
            areaId: 'orderGridRow',
            source: getComponentSource("grid/rows/basic.js"),
            props: {
                id: "order_id"
            },
            sortOrder: 1
        },
        {
            id: 'emailColumn',
            areaId: 'orderGridHeader',
            source: getComponentSource("grid/headers/fromTo.js"),
            props: {
                title: "Customer email",
                id: "customer_email"
            },
            sortOrder: 5
        },
        {
            id: 'emailRow',
            areaId: 'orderGridRow',
            source: getComponentSource("grid/rows/basic.js"),
            props: {
                id: "customer_email"
            },
            sortOrder: 5
        },
        {
            id: 'totalColumn',
            areaId: 'orderGridHeader',
            source: getComponentSource("grid/headers/fromTo.js"),
            props: {
                title: "Grand total",
                id: "grand_total"
            },
            sortOrder: 10
        },
        {
            id: 'totalRow',
            areaId: 'orderGridRow',
            source: getComponentSource("grid/rows/basic.js"),
            props: {
                id: "grand_total"
            },
            sortOrder: 10
        },
        {
            id: 'actionHeader',
            areaId: 'orderGridHeader',
            source: getComponentSource("grid/headers/action.js"),
            props: {
                gridOriginalUrl: buildAdminUrl("orderGrid")
            },
            sortOrder: 35
        },
        {
            id: 'actionRow',
            areaId: 'orderGridRow',
            source: getComponentSource("grid/rows/action.js"),
            props: {
                id: "action"
            },
            sortOrder: 35
        }
    ],
    "dashboard": [
        {
            id: "statistic",
            areaId: 'left.side',
            source: getComponentSource("sale/components/admin/dashboard/statistic.js", true),
            props: { api: buildAdminUrl("salestatistic", { "period": "daily" }) },
            sortOrder: 10
        },
        {
            id: "lifetimesales",
            areaId: 'right.side',
            source: getComponentSource("sale/components/admin/dashboard/lifetimesales.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "bestsellers",
            areaId: 'left.side',
            source: getComponentSource("sale/components/admin/dashboard/bestsellers.js"),
            props: {
                listUrl: buildAdminUrl('productGrid')
            },
            sortOrder: 20
        },
        {
            id: "bestcustomers",
            areaId: 'right.side',
            source: getComponentSource("sale/components/admin/dashboard/bestcustomers.js"),
            props: {
                listUrl: ''// TODO: add customer grid url
            },
            sortOrder: 20
        }
    ]
}
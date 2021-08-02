const { getComponentSource, getAdminJsFile } = require("../../../../lib/helpers");
const { buildAdminUrl } = require("../../../../lib/routie");

exports = module.exports = {
    '*': [
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
    ],
    categoryEdit: [
        {
            id: "metaTitle",
            areaId: "head",
            source: getComponentSource("title.js"),
            props: {
                title: "Edit category"
            },
            sortOrder: 10
        },
        {
            id: "title",
            areaId: "content",
            source: getComponentSource("cms/components/admin/title.js"),
            props: {
                title: "Edit category"
            },
            sortOrder: 10
        }
    ],
    categoryNew: [
        {
            id: "metaTitle",
            areaId: "head",
            source: getComponentSource("title.js"),
            props: {
                title: "Create a new category"
            },
            sortOrder: 10
        },
        {
            id: "title",
            areaId: "content",
            source: getComponentSource("cms/components/admin/title.js"),
            props: {
                title: "Create a new category"
            },
            sortOrder: 10
        }
    ],
    'categoryNew+categoryEdit': [
        {
            id: "categoryForm",
            areaId: "content",
            source: getComponentSource("catalog/components/admin/category/edit/categoryEditForm.js"),
            props: {
                id: "category-edit-form",
                method: "POST",
                action: buildAdminUrl("categorySavePost"),
                gridUrl: buildAdminUrl("categoryGrid"),
                uploadApi: buildAdminUrl("imageUpload", [""])
            },
            sortOrder: 10
        },
        {
            id: "ckeditor",
            areaId: "head",
            source: getComponentSource("script.js", true),
            props: {
                src: buildAdminUrl("adminStaticAsset", [getAdminJsFile('ckeditor4/ckeditor.js').replace("/", "")]),
            },
            sortOrder: 1
        },
        {
            id: "categoryEditGeneral",
            areaId: "left.side",
            source: getComponentSource("catalog/components/admin/category/edit/general.js"),
            props: {
                browserApi: buildAdminUrl("fileBrowser", [""]),
                deleteApi: buildAdminUrl("fileDelete", [""]),
                uploadApi: buildAdminUrl("imageUpload", [""]),
                folderCreateApi: buildAdminUrl("folderCreate", [""])
            },
            sortOrder: 10
        },
        {
            id: "categoryEditSEO",
            areaId: "right.side",
            source: getComponentSource("catalog/components/admin/category/edit/seo.js"),
            props: {},
            sortOrder: 20
        }
    ],
    "categoryGrid": [
        {
            id: "categoryGrid",
            areaId: 'content',
            source: getComponentSource("catalog/components/admin/category/grid/grid.js"),
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
                title: "Categories"
            },
            sortOrder: 1
        },
        {
            id: 'title',
            areaId: 'head',
            source: getComponentSource("title.js", true),
            props: {
                title: "Categories"
            },
            sortOrder: 1
        },
        {
            id: 'statusColumn',
            areaId: 'categoryGridHeader',
            source: getComponentSource("grid/headers/status.js"),
            props: {
                title: "Status",
                id: "status"
            },
            sortOrder: 25
        },
        {
            id: 'statusRow',
            areaId: 'categoryGridRow',
            source: getComponentSource("grid/rows/status.js"),
            props: {
                id: "status"
            },
            sortOrder: 25
        },
        {
            id: 'nameColumn',
            areaId: 'categoryGridHeader',
            source: getComponentSource("grid/headers/basic.js"),
            props: {
                title: "Category name",
                id: "name"
            },
            sortOrder: 5
        },
        {
            id: 'nameRow',
            areaId: 'categoryGridRow',
            source: getComponentSource("grid/rows/basic.js"),
            props: {
                id: "name"
            },
            sortOrder: 5
        },
        {
            id: 'idColumn',
            areaId: 'categoryGridHeader',
            source: getComponentSource("grid/headers/fromTo.js"),
            props: {
                title: "ID",
                id: "category_id"
            },
            sortOrder: 1
        },
        {
            id: 'idRow',
            areaId: 'categoryGridRow',
            source: getComponentSource("grid/rows/basic.js"),
            props: {
                id: "category_id"
            },
            sortOrder: 1
        },
        {
            id: 'actionHeader',
            areaId: 'categoryGridHeader',
            source: getComponentSource("grid/headers/action.js"),
            props: {
                gridOriginalUrl: buildAdminUrl("categoryGrid")
            },
            sortOrder: 35
        },
        {
            id: 'actionRow',
            areaId: 'categoryGridRow',
            source: getComponentSource("grid/rows/action.js"),
            props: {
                id: "action"
            },
            sortOrder: 35
        }
    ],
    /** PRODUCT */
    productEdit: [
        {
            id: "metaTitle",
            areaId: "head",
            source: getComponentSource("title.js"),
            props: {
                title: "Edit product"
            },
            sortOrder: 10
        }
    ],
    productNew: [
        {
            id: "metaTitle",
            areaId: "head",
            source: getComponentSource("title.js"),
            props: {
                title: "Create a new product"
            },
            sortOrder: 10
        }
    ],
    'productNew+productEdit': [
        {
            id: "pageHeading",
            areaId: "content",
            source: getComponentSource("cms/components/admin/PageHeading.js"),
            props: {
                backUrl: buildAdminUrl('productGrid')
            },
            sortOrder: 10
        },
        {
            id: "productForm",
            areaId: "content",
            source: getComponentSource("catalog/components/admin/product/edit/ProductEditForm.js"),
            props: {
                id: "product-edit-form",
                method: "POST",
                action: buildAdminUrl("productSavePost"),
                gridUrl: buildAdminUrl("productGrid"),
                uploadApi: buildAdminUrl("imageUpload", [""])
            },
            sortOrder: 10
        },
        {
            id: "ckeditor",
            areaId: 'head',
            source: getComponentSource("script.js", true),
            props: {
                src: buildAdminUrl("adminStaticAsset", ['admin/default/js/ckeditor4/ckeditor.js']),
            },
            sortOrder: 1
        },
        {
            id: "dragable",
            areaId: 'head',
            source: getComponentSource("script.js", true),
            props: {
                src: 'https://cdn.jsdelivr.net/npm/@shopify/draggable@1.0.0-beta.12/lib/swappable.js',
                async: true
            },
            sortOrder: 1
        },
        {
            id: "productEditGeneral",
            areaId: "leftSide",
            source: getComponentSource("catalog/components/admin/product/edit/General.js"),
            props: {
                browserApi: buildAdminUrl("fileBrowser", [""]),
                deleteApi: buildAdminUrl("fileDelete", [""]),
                uploadApi: buildAdminUrl("imageUpload", [""]),
                folderCreateApi: buildAdminUrl("folderCreate", [""])
            },
            sortOrder: 10
        },
        {
            id: "productEditStatus",
            areaId: "rightSide",
            source: getComponentSource("catalog/components/admin/product/edit/Status.js"),
            props: {
                browserApi: buildAdminUrl("fileBrowser", [""]),
                deleteApi: buildAdminUrl("fileDelete", [""]),
                uploadApi: buildAdminUrl("imageUpload", [""]),
                folderCreateApi: buildAdminUrl("folderCreate", [""])
            },
            sortOrder: 10
        },
        {
            id: "productEditImages",
            areaId: "leftSide",
            source: getComponentSource("catalog/components/admin/product/edit/Media.js"),
            props: {},
            sortOrder: 20
        },
        {
            id: "productEditAttribute",
            areaId: "rightSide",
            source: getComponentSource("catalog/components/admin/product/edit/Attributes.js"),
            props: {},
            sortOrder: 30
        },
        {
            id: "productEditInventory",
            areaId: "rightSide",
            source: getComponentSource("catalog/components/admin/product/edit/Inventory.js"),
            props: {},
            sortOrder: 20
        },
        {
            id: "productEditOptions",
            areaId: "leftSide",
            source: getComponentSource("catalog/components/admin/product/edit/CustomOptions.js"),
            props: {},
            sortOrder: 30
        },
        {
            id: "productEditVariants",
            areaId: "leftSide",
            source: getComponentSource("catalog/components/admin/product/edit/Variants.js"),
            props: {},
            sortOrder: 40
        },
        {
            id: "productEditSEO",
            areaId: "leftSide",
            source: getComponentSource("catalog/components/admin/product/edit/Seo.js"),
            props: {},
            sortOrder: 50
        }
    ],
    "productGrid": [
        {
            id: "productGrid",
            areaId: 'content',
            source: getComponentSource("catalog/components/admin/product/grid/grid.js"),
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
                title: "Products"
            },
            sortOrder: 1
        },
        {
            id: 'title',
            areaId: 'head',
            source: getComponentSource("title.js", true),
            props: {
                title: "Products"
            },
            sortOrder: 1
        },
        {
            id: 'statusColumn',
            areaId: 'productGridHeader',
            source: getComponentSource("grid/headers/status.js"),
            props: {
                title: "Status",
                id: "status"
            },
            sortOrder: 25
        },
        {
            id: 'statusRow',
            areaId: 'productGridRow',
            source: getComponentSource("grid/rows/status.js"),
            props: {
                id: "status"
            },
            sortOrder: 25
        },
        {
            id: 'nameColumn',
            areaId: 'productGridHeader',
            source: getComponentSource("grid/headers/basic.js"),
            props: {
                title: "Product name",
                id: "name"
            },
            sortOrder: 5
        },
        {
            id: 'nameRow',
            areaId: 'productGridRow',
            source: getComponentSource("grid/rows/basic.js"),
            props: {
                id: "name"
            },
            sortOrder: 5
        },
        {
            id: 'idColumn',
            areaId: 'productGridHeader',
            source: getComponentSource("grid/headers/fromTo.js"),
            props: {
                title: "ID",
                id: "product_id"
            },
            sortOrder: 1
        },
        {
            id: 'idRow',
            areaId: 'productGridRow',
            source: getComponentSource("grid/rows/basic.js"),
            props: {
                id: "product_id"
            },
            sortOrder: 1
        },
        {
            id: 'priceColumn',
            areaId: 'productGridHeader',
            source: getComponentSource("grid/headers/fromTo.js"),
            props: {
                title: "Price",
                id: "price"
            },
            sortOrder: 10
        },
        {
            id: 'priceRow',
            areaId: 'productGridRow',
            source: getComponentSource("grid/rows/basic.js"),
            props: {
                id: "price"
            },
            sortOrder: 10
        },
        {
            id: 'qtyColumn',
            areaId: 'productGridHeader',
            source: getComponentSource("grid/headers/fromTo.js"),
            props: {
                title: "Qty",
                id: "qty"
            },
            sortOrder: 20
        },
        {
            id: 'qtyRow',
            areaId: 'productGridRow',
            source: getComponentSource("grid/rows/basic.js"),
            props: {
                id: "qty"
            },
            sortOrder: 20
        },
        {
            id: 'skuColumn',
            areaId: 'productGridHeader',
            source: getComponentSource("grid/headers/basic.js"),
            props: {
                title: "SKU",
                id: "sku"
            },
            sortOrder: 15
        },
        {
            id: 'skuRow',
            areaId: 'productGridRow',
            source: getComponentSource("grid/rows/basic.js"),
            props: {
                id: "sku"
            },
            sortOrder: 15
        },
        {
            id: 'actionHeader',
            areaId: 'productGridHeader',
            source: getComponentSource("grid/headers/action.js"),
            props: {
                gridOriginalUrl: buildAdminUrl("productGrid")
            },
            sortOrder: 35
        },
        {
            id: 'actionRow',
            areaId: 'productGridRow',
            source: getComponentSource("grid/rows/action.js"),
            props: {
                id: "action"
            },
            sortOrder: 35
        }
    ]
}
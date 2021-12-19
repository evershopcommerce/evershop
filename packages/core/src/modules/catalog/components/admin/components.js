const { buildAdminUrl } = require("../../../../lib/routie");
const { useComponent, useAdminComponent } = require("../../../../lib/componee")

exports = module.exports = {
    '*': [
        {
            id: "catalog.group",
            areaId: 'admin.menu',
            source: useAdminComponent("cms/components/admin/NavigationItemGroup.js"),
            props: {
                id: 'catalog.group',
                name: 'Catalog'
            },
            sortOrder: 10
        },
        {
            id: "new.product",
            areaId: 'quick.links',
            source: useAdminComponent("cms/components/admin/NavigationItem.js"),
            props: {
                "icon": "ArchiveIcon",
                "url": buildAdminUrl("productNew"),
                "title": "New Product"
            },
            sortOrder: 10
        },
        {
            id: "products",
            areaId: 'catalog.group',
            source: useAdminComponent("cms/components/admin/NavigationItem.js"),
            props: {
                "icon": "ArchiveIcon",
                "url": buildAdminUrl("productGrid"),
                "title": "Products"
            },
            sortOrder: 5
        },
        {
            id: "categories",
            areaId: 'catalog.group',
            source: useAdminComponent("cms/components/admin/NavigationItem.js"),
            props: {
                "icon": "TagIcon",
                "url": buildAdminUrl("categoryGrid"),
                "title": "Categories"
            },
            sortOrder: 10
        },
        {
            id: "attributes",
            areaId: 'catalog.group',
            source: useAdminComponent("cms/components/admin/NavigationItem.js"),
            props: {
                "icon": "HashtagIcon",
                "url": buildAdminUrl("attributeGrid"),
                "title": "Attributes"
            },
            sortOrder: 15
        }
    ],
    categoryEdit: [
        {
            id: "metaTitle",
            areaId: "head",
            source: useComponent("Title.js"),
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
            source: useComponent("Title.js"),
            props: {
                title: "Create a new category"
            },
            sortOrder: 10
        }
    ],
    'categoryNew+categoryEdit': [
        {
            id: "pageHeading",
            areaId: "content",
            source: useAdminComponent("cms/components/admin/PageHeading.js"),
            props: {
                backUrl: buildAdminUrl('categoryGrid')
            },
            sortOrder: 10
        },
        {
            id: "categoryForm",
            areaId: "content",
            source: useAdminComponent("catalog/components/admin/category/edit/CategoryEditForm.js"),
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
            areaId: 'head',
            source: useComponent("Script.js"),
            props: {
                src: buildAdminUrl("adminStaticAsset", ['admin/default/js/ckeditor4/ckeditor.js']),
            },
            sortOrder: 1
        },
        {
            id: "categoryEditGeneral",
            areaId: "leftSide",
            source: useAdminComponent("catalog/components/admin/category/edit/General.js"),
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
            areaId: "rightSide",
            source: useAdminComponent("catalog/components/admin/category/edit/Seo.js"),
            props: {},
            sortOrder: 20
        },
        {
            id: "categoryEditBanner",
            areaId: "rightSide",
            source: useAdminComponent("catalog/components/admin/category/edit/Image.js"),
            props: {},
            sortOrder: 10
        }
    ],
    "categoryGrid": [
        {
            id: "categoryGrid",
            areaId: 'content',
            source: useAdminComponent("catalog/components/admin/category/grid/Grid.js"),
            props: {
                limit: 20
            },
            sortOrder: 20
        },
        {
            id: "pageHeading",
            areaId: "content",
            source: useAdminComponent("cms/components/admin/PageHeading.js"),
            props: {
            },
            sortOrder: 10
        },
        {
            id: "newCategoryButton",
            areaId: "pageHeadingRight",
            source: useComponent("form/Button.js"),
            props: {
                title: 'Add category',
                variant: 'primary',
                url: buildAdminUrl('categoryNew')
            },
            sortOrder: 10
        },
        {
            id: 'title',
            areaId: 'head',
            source: useComponent("Title.js"),
            props: {
                title: "Categories"
            },
            sortOrder: 1
        },
        {
            id: 'statusColumn',
            areaId: 'categoryGridHeader',
            source: useComponent("grid/headers/Status.js"),
            props: {
                title: "Status",
                id: "status"
            },
            sortOrder: 25
        },
        {
            id: 'statusRow',
            areaId: 'categoryGridRow',
            source: useComponent("grid/rows/Status.js"),
            props: {
                id: "status"
            },
            sortOrder: 25
        },
        {
            id: 'nameColumn',
            areaId: 'categoryGridHeader',
            source: useComponent("grid/headers/Basic.js"),
            props: {
                title: "Category name",
                id: "name"
            },
            sortOrder: 5
        },
        {
            id: 'nameRow',
            areaId: 'categoryGridRow',
            source: useAdminComponent("catalog/components/admin/category/grid/NameRow.js"),
            props: {
                id: "name",
                editUrl: "editUrl"
            },
            sortOrder: 5
        }
    ],
    /** PRODUCT */
    productEdit: [
        {
            id: "metaTitle",
            areaId: "head",
            source: useComponent("Title.js"),
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
            source: useComponent("Title.js"),
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
            source: useAdminComponent("cms/components/admin/PageHeading.js"),
            props: {
                backUrl: buildAdminUrl('productGrid')
            },
            sortOrder: 10
        },
        {
            id: "productForm",
            areaId: "content",
            source: useAdminComponent("catalog/components/admin/product/edit/ProductEditForm.js"),
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
            source: useComponent("Script.js"),
            props: {
                src: buildAdminUrl("adminStaticAsset", ['admin/default/js/ckeditor4/ckeditor.js']),
            },
            sortOrder: 1
        },
        {
            id: "dragable",
            areaId: 'head',
            source: useComponent("Script.js"),
            props: {
                src: 'https://cdn.jsdelivr.net/npm/@shopify/draggable@1.0.0-beta.12/lib/swappable.js',
                async: true
            },
            sortOrder: 1
        },
        {
            id: "productEditGeneral",
            areaId: "leftSide",
            source: useAdminComponent("catalog/components/admin/product/edit/General.js"),
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
            source: useAdminComponent("catalog/components/admin/product/edit/Status.js"),
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
            source: useAdminComponent("catalog/components/admin/product/edit/Media.js"),
            props: {},
            sortOrder: 20
        },
        {
            id: "productEditAttribute",
            areaId: "rightSide",
            source: useAdminComponent("catalog/components/admin/product/edit/Attributes.js"),
            props: {},
            sortOrder: 30
        },
        {
            id: "productEditInventory",
            areaId: "rightSide",
            source: useAdminComponent("catalog/components/admin/product/edit/Inventory.js"),
            props: {},
            sortOrder: 20
        },
        {
            id: "productEditOptions",
            areaId: "leftSide",
            source: useAdminComponent("catalog/components/admin/product/edit/CustomOptions.js"),
            props: {},
            sortOrder: 30
        },
        {
            id: "productEditVariants",
            areaId: "leftSide",
            source: useAdminComponent("catalog/components/admin/product/edit/Variants.js"),
            props: {},
            sortOrder: 40
        },
        {
            id: "productEditSEO",
            areaId: "leftSide",
            source: useAdminComponent("catalog/components/admin/product/edit/Seo.js"),
            props: {},
            sortOrder: 50
        }
    ],
    "productGrid": [
        {
            id: "productGrid",
            areaId: 'content',
            source: useAdminComponent("catalog/components/admin/product/grid/Grid.js"),
            props: {
                limit: 20
            },
            sortOrder: 20
        },
        {
            id: "pageHeading",
            areaId: "content",
            source: useAdminComponent("cms/components/admin/PageHeading.js"),
            props: {
            },
            sortOrder: 10
        },
        {
            id: "newProductButton",
            areaId: "pageHeadingRight",
            source: useComponent("form/Button.js"),
            props: {
                title: 'Add product',
                variant: 'primary',
                url: buildAdminUrl('productNew')
            },
            sortOrder: 10
        },
        {
            id: 'title',
            areaId: 'head',
            source: useComponent("Title.js"),
            props: {
                title: "Products"
            },
            sortOrder: 1
        },
        {
            id: 'statusColumn',
            areaId: 'productGridHeader',
            source: useComponent("grid/headers/Status.js"),
            props: {
                title: "Status",
                id: "status"
            },
            sortOrder: 25
        },
        {
            id: 'statusRow',
            areaId: 'productGridRow',
            source: useComponent("grid/rows/Status.js"),
            props: {
                id: "status"
            },
            sortOrder: 25
        },
        {
            id: 'nameColumn',
            areaId: 'productGridHeader',
            source: useComponent("grid/headers/Basic.js"),
            props: {
                title: "Product name",
                id: "name"
            },
            sortOrder: 5
        },
        {
            id: 'nameRow',
            areaId: 'productGridRow',
            source: useAdminComponent("catalog/components/admin/product/grid/NameRow.js"),
            props: {
                id: "name",
                editUrl: "editUrl"
            },
            sortOrder: 5
        },
        {
            id: 'thumbnailColumn',
            areaId: 'productGridHeader',
            source: useComponent("grid/headers/Dummy.js"),
            props: {
                title: "",
                id: "image"
            },
            sortOrder: 1
        },
        {
            id: 'thumbnailRow',
            areaId: 'productGridRow',
            source: useComponent("grid/rows/Thumbnail.js"),
            props: {
                id: "image"
            },
            sortOrder: 1
        },
        {
            id: 'priceColumn',
            areaId: 'productGridHeader',
            source: useComponent("grid/headers/FromTo.js"),
            props: {
                title: "Price",
                id: "price"
            },
            sortOrder: 10
        },
        {
            id: 'priceRow',
            areaId: 'productGridRow',
            source: useAdminComponent("catalog/components/admin/product/grid/PriceRow.js"),
            props: {
                id: "price"
            },
            sortOrder: 10
        },
        {
            id: 'qtyColumn',
            areaId: 'productGridHeader',
            source: useComponent("grid/headers/FromTo.js"),
            props: {
                title: "Qty",
                id: "qty"
            },
            sortOrder: 20
        },
        {
            id: 'qtyRow',
            areaId: 'productGridRow',
            source: useComponent("grid/rows/Basic.js"),
            props: {
                id: "qty"
            },
            sortOrder: 20
        },
        {
            id: 'skuColumn',
            areaId: 'productGridHeader',
            source: useComponent("grid/headers/Basic.js"),
            props: {
                title: "SKU",
                id: "sku"
            },
            sortOrder: 15
        },
        {
            id: 'skuRow',
            areaId: 'productGridRow',
            source: useComponent("grid/rows/Basic.js"),
            props: {
                id: "sku"
            },
            sortOrder: 15
        }
    ],
    categoryEdit: [
        {
            id: "metaTitle",
            areaId: "head",
            source: useComponent("Title.js"),
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
            source: useComponent("Title.js"),
            props: {
                title: "Create a new category"
            },
            sortOrder: 10
        }
    ],
    'categoryNew+categoryEdit': [
        {
            id: "pageHeading",
            areaId: "content",
            source: useAdminComponent("cms/components/admin/PageHeading.js"),
            props: {
                backUrl: buildAdminUrl('categoryGrid')
            },
            sortOrder: 10
        },
        {
            id: "categoryForm",
            areaId: "content",
            source: useAdminComponent("catalog/components/admin/category/edit/CategoryEditForm.js"),
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
            areaId: 'head',
            source: useComponent("Script.js"),
            props: {
                src: buildAdminUrl("adminStaticAsset", ['admin/default/js/ckeditor4/ckeditor.js']),
            },
            sortOrder: 1
        },
        {
            id: "categoryEditGeneral",
            areaId: "leftSide",
            source: useAdminComponent("catalog/components/admin/category/edit/General.js"),
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
            areaId: "rightSide",
            source: useAdminComponent("catalog/components/admin/category/edit/Seo.js"),
            props: {},
            sortOrder: 20
        },
        {
            id: "categoryEditBanner",
            areaId: "rightSide",
            source: useAdminComponent("catalog/components/admin/category/edit/Image.js"),
            props: {},
            sortOrder: 10
        }
    ],
    /* Attributes */
    "attributeGrid": [
        {
            id: "attributeGrid",
            areaId: 'content',
            source: useAdminComponent("catalog/components/admin/attribute/grid/Grid.js"),
            props: {
                limit: 20
            },
            sortOrder: 20
        },
        {
            id: "pageHeading",
            areaId: "content",
            source: useAdminComponent("cms/components/admin/PageHeading.js"),
            props: {
            },
            sortOrder: 10
        },
        {
            id: "newAttributeButton",
            areaId: "pageHeadingRight",
            source: useComponent("form/Button.js"),
            props: {
                title: 'Add attribute',
                variant: 'primary',
                url: buildAdminUrl('attributeNew')
            },
            sortOrder: 10
        },
        {
            id: 'title',
            areaId: 'head',
            source: useComponent("Title.js"),
            props: {
                title: "Attributes"
            },
            sortOrder: 1
        },
        {
            id: 'nameColumn',
            areaId: 'attributeGridHeader',
            source: useComponent("grid/headers/Basic.js"),
            props: {
                title: "Attribute name",
                id: "attribute_name"
            },
            sortOrder: 5
        },
        {
            id: 'nameRow',
            areaId: 'attributeGridRow',
            source: useAdminComponent("catalog/components/admin/attribute/grid/NameRow.js"),
            props: {
                id: "attribute_name",
                editUrl: "editUrl"
            },
            sortOrder: 5
        },
        {
            id: 'groupColumn',
            areaId: 'attributeGridHeader',
            source: useAdminComponent("catalog/components/admin/attribute/grid/GroupHeaderColumn.js"),
            props: {
                title: "Assigned group",
                id: "group"
            },
            sortOrder: 8
        },
        {
            id: 'groupRow',
            areaId: 'attributeGridRow',
            source: useAdminComponent("catalog/components/admin/attribute/grid/GroupRow.js"),
            props: {
                id: "groups"
            },
            sortOrder: 8
        },
        {
            id: 'typeColumn',
            areaId: 'attributeGridHeader',
            source: useComponent("grid/headers/Dropdown.js"),
            props: {
                title: "Type",
                id: "type",
                options: [
                    { value: 'text', text: 'Text' },
                    { value: 'select', text: 'Select' },
                    { value: 'multiselect', text: 'Multi select' },
                    { value: 'textarea', text: 'Textarea' },
                ]
            },
            sortOrder: 10
        },
        {
            id: 'typeRow',
            areaId: 'attributeGridRow',
            source: useAdminComponent("catalog/components/admin/attribute/grid/TypeRow.js"),
            props: {
                id: "type"
            },
            sortOrder: 10
        },
        {
            id: 'isRequiredColumn',
            areaId: 'attributeGridHeader',
            source: useComponent("grid/headers/Dropdown.js"),
            props: {
                title: "Is Required?",
                id: "is_required",
                options: [
                    { value: '1', text: 'Yes' },
                    { value: '0', text: 'No' }
                ]
            },
            sortOrder: 15
        },
        {
            id: 'isRequiredRow',
            areaId: 'attributeGridRow',
            source: useComponent("grid/rows/YesNo.js"),
            props: {
                id: "is_required"
            },
            sortOrder: 15
        },
        {
            id: 'isFilterableColumn',
            areaId: 'attributeGridHeader',
            source: useComponent("grid/headers/Dropdown.js"),
            props: {
                title: "Is Filterable?",
                id: "is_filterable",
                options: [
                    { value: '1', text: 'Yes' },
                    { value: '0', text: 'No' }
                ]
            },
            sortOrder: 20
        },
        {
            id: 'isFilterableRow',
            areaId: 'attributeGridRow',
            source: useComponent("grid/rows/YesNo.js"),
            props: {
                id: "is_filterable"
            },
            sortOrder: 20
        }
    ],
    attributeEdit: [
        {
            id: "metaTitle",
            areaId: "head",
            source: useComponent("Title.js"),
            props: {
                title: "Edit attribute"
            },
            sortOrder: 10
        }
    ],
    attributeNew: [
        {
            id: "metaTitle",
            areaId: "head",
            source: useComponent("Title.js"),
            props: {
                title: "Create a new attribute"
            },
            sortOrder: 10
        }
    ],
    'attributeNew+attributeEdit': [
        {
            id: "pageHeading",
            areaId: "content",
            source: useAdminComponent("cms/components/admin/PageHeading.js"),
            props: {
                backUrl: buildAdminUrl('attributeGrid')
            },
            sortOrder: 10
        },
        {
            id: "attributeForm",
            areaId: "content",
            source: useAdminComponent("catalog/components/admin/attribute/edit/AttributeEditForm.js"),
            props: {
                id: "attribute-edit-form",
                method: "POST",
                action: buildAdminUrl("attributeSavePost"),
                gridUrl: buildAdminUrl("attributeGrid")
            },
            sortOrder: 10
        },
        {
            id: "attributeEditGeneral",
            areaId: "leftSide",
            source: useAdminComponent("catalog/components/admin/attribute/edit/General.js"),
            props: {
            },
            sortOrder: 10
        },
        {
            id: "attributeEditAvaibility",
            areaId: "rightSide",
            source: useAdminComponent("catalog/components/admin/attribute/edit/Avaibility.js"),
            props: {
            },
            sortOrder: 10
        }
    ]
}
const { getComponentSource } = require("../../../../lib/helpers");
const { buildSiteUrl } = require("../../../../lib/routie");

exports = module.exports = {
    categoryView: [
        {
            // General block
            id: "categoryGeneral",
            areaId: "content",
            source: getComponentSource("catalog/components/site/category/view/General.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "productsFilter",
            areaId: "content",
            source: getComponentSource("catalog/components/site/product/list/Filter.js"),
            props: {},
            sortOrder: 20
        },
        {
            id: "products",
            areaId: "content",
            source: getComponentSource("catalog/components/site/category/view/Products.js"),
            props: {},
            sortOrder: 30
        }
    ],
    productView: [
        {
            // General block
            id: "productLayout",
            areaId: "content",
            source: getComponentSource("catalog/components/site/product/view/Layout.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "productForm",
            areaId: "productPageMiddleRight",
            source: getComponentSource("catalog/components/site/product/view/Form.js"),
            props: {
                action: buildSiteUrl("addToCart")
            },
            sortOrder: 50
        },
        {
            id: "productGeneralInfo",
            areaId: "productPageMiddleRight",
            source: getComponentSource("catalog/components/site/product/view/GeneralInfo.js"),
            props: {
                action: buildSiteUrl("addToCart")
            },
            sortOrder: 10
        },
        {
            id: "productImages",
            areaId: "productPageMiddleLeft",
            source: getComponentSource("catalog/components/site/product/view/Images.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "productDescription",
            areaId: "productPageMiddleRight",
            source: getComponentSource("catalog/components/site/product/view/Description.js"),
            props: {},
            sortOrder: 60
        },
        {
            id: "productVariants",
            areaId: "productPageMiddleRight",
            source: getComponentSource("catalog/components/site/product/view/Variants.js"),
            props: {},
            sortOrder: 20
        }
    ],
    "homepage": [
        {
            id: "featuredCat",
            areaId: "content",
            source: getComponentSource("catalog/components/site/homepage/FeaturedCategories.js"),
            props: {},
            sortOrder: 20
        },
        {
            id: "featuredProducts",
            areaId: "content",
            source: getComponentSource("catalog/components/site/homepage/FeaturedProducts.js"),
            props: {},
            sortOrder: 30
        }
    ]
}
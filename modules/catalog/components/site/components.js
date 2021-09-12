const { getComponentSource } = require("../../../../lib/helpers");
const { buildSiteUrl } = require("../../../../lib/routie");

exports = module.exports = {
    categoryView: [
        {
            // General block
            id: "categoryGeneral",
            areaId: "content",
            source: getComponentSource("catalog/components/site/category/view/general.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "productsFilter",
            areaId: "content",
            source: getComponentSource("catalog/components/site/product/list/filter.js"),
            props: {},
            sortOrder: 20
        },
        {
            id: "products",
            areaId: "content",
            source: getComponentSource("catalog/components/site/category/view/products.js"),
            props: {},
            sortOrder: 30
        }
    ],
    productView: [
        {
            // General block
            id: "productLayout",
            areaId: "content",
            source: getComponentSource("catalog/components/site/product/view/layout.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "productForm",
            areaId: "productPageMiddleRight",
            source: getComponentSource("catalog/components/site/product/view/form.js"),
            props: {
                action: buildSiteUrl("addToCart")
            },
            sortOrder: 50
        },
        {
            id: "productGeneralInfo",
            areaId: "productPageMiddleRight",
            source: getComponentSource("catalog/components/site/product/view/generalInfo.js"),
            props: {
                action: buildSiteUrl("addToCart")
            },
            sortOrder: 10
        },
        {
            id: "productImages",
            areaId: "productPageMiddleLeft",
            source: getComponentSource("catalog/components/site/product/view/images.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "productDescription",
            areaId: "productPageBottom",
            source: getComponentSource("catalog/components/site/product/view/description.js"),
            props: {},
            sortOrder: 10
        },
        {
            id: "productVariants",
            areaId: "productPageMiddleRight",
            source: getComponentSource("catalog/components/site/product/view/variants.js"),
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
            source: getComponentSource("catalog/components/site/homepage/featuredProducts.js"),
            props: {},
            sortOrder: 30
        }
    ]
}
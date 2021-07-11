module.exports = function ({ registerSiteRoute, registerAdminRoute }) {
    registerAdminRoute("productNew", ["GET"], "/product/new");

    registerAdminRoute("productEdit", ["GET"], "/product/edit/:id(\\d+)");

    registerAdminRoute("variantSearch", ["GET", "POST"], "/variant/search");

    registerAdminRoute("productSavePost", ["POST"], "/product/save");

    registerAdminRoute("productGrid", ["GET"], "/products");

    registerAdminRoute("categoryGrid", ["GET"], "/categories");

    registerAdminRoute("categoryEdit", ["GET"], "/category/edit/:id(\\d+)");

    registerAdminRoute("categorySavePost", ["POST"], "/category/save");

    // Site routes
    registerSiteRoute("categoryView", ["GET"], "/category/:url_key");

    registerSiteRoute("productView", ["GET"], "/product/:url_key");
}

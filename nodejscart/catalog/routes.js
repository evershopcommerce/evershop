module.exports = function ({ registerSiteRoute, registerAdminRoute }) {
    registerAdminRoute("productNew", ["GET"], "/product/new");

    registerAdminRoute("productEdit", ["GET"], "/product/edit/:id(\\d+)");

    registerAdminRoute("variantSearch", ["GET", "POST"], "/variant/search");

    registerAdminRoute("productSaveNew", ["POST"], "/product/create");

    registerAdminRoute("productSaveEdit", ["POST"], "/product/update/:id(\\d+)");

    registerAdminRoute("productGrid", ["GET"], "/products");

    registerAdminRoute("categoryGrid", ["GET"], "/categories");

    registerAdminRoute("categoryEdit", ["GET"], "/category/edit/:id(\\d+)");

    registerAdminRoute("categorySaveNew", ["POST"], "/category/create");

    registerAdminRoute("categorySaveEdit", ["POST"], "/category/update/:id(\\d+)");

    // Site routes
    registerSiteRoute("categoryView", ["GET"], "/category/:url_key");

    registerSiteRoute("productView", ["GET"], "/product/:url_key");
}

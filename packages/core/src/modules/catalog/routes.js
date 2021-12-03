module.exports = function ({ registerSiteRoute, registerAdminRoute }) {
    registerAdminRoute("productNew", ["GET"], "/products/new");

    registerAdminRoute("productEdit", ["GET"], "/products/edit/:id(\\d+)");

    registerAdminRoute("variantSearch", ["GET", "POST"], "/variant/search");

    registerAdminRoute("unlinkVariant", ["POST"], "/variant/unlink");

    registerAdminRoute("productSavePost", ["POST"], "/product/save");

    registerAdminRoute("productDelete", ["POST", "GET"], "/product/delete/:id(\\d+)");

    registerAdminRoute("productBulkDelete", ["POST"], "/product/bulkDelete");

    registerAdminRoute("productBulkEnable", ["POST"], "/product/bulkEnable");

    registerAdminRoute("productBulkDisable", ["POST"], "/product/bulkDisable");

    registerAdminRoute("productGrid", ["GET"], "/products");

    registerAdminRoute("categoryGrid", ["GET"], "/categories");

    registerAdminRoute("categoryBulkDelete", ["POST"], "/category/bulkDelete");

    registerAdminRoute("categoryNew", ["GET"], "/categories/new");

    registerAdminRoute("categoryEdit", ["GET"], "/categories/edit/:id(\\d+)");

    registerAdminRoute("categorySavePost", ["POST"], "/category/save");

    registerAdminRoute("attributeGrid", ["GET"], "/attributes");

    registerAdminRoute("attributeBulkDelete", ["POST"], "/attribute/bulkDelete");

    registerAdminRoute("attributeNew", ["GET"], "/attributes/new");

    registerAdminRoute("attributeEdit", ["GET"], "/attributes/edit/:id(\\d+)");

    registerAdminRoute("attributeSavePost", ["POST"], "/attribute/save");

    registerAdminRoute("attributeGroupSavePost", ["POST"], "/attributeGroup/save");

    // Site routes
    registerSiteRoute("categoryView", ["GET"], "/category/:url_key");

    registerSiteRoute("productView", ["GET"], "/product/:url_key");
}

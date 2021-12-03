module.exports = function ({ registerSiteRoute, registerAdminRoute }) {

    registerSiteRoute("staticAsset", ["GET"], "/assets/*");

    registerAdminRoute("adminStaticAsset", ["GET"], "/assets/*");

    registerSiteRoute("homepage", ["GET"], "/");

    registerAdminRoute("dashboard", ["GET"], "/");

    registerAdminRoute("cmsPageNew", ["GET"], "/pages/new");

    registerAdminRoute("cmsPageEdit", ["GET"], "/pages/edit/:id(\\d+)")

    registerAdminRoute("cmsPageBulkDelete", ["POST"], "/page/bulkDelete");

    registerAdminRoute("cmsPageSavePost", ["POST"], "/page/save");

    registerAdminRoute("cmsPageGrid", ["GET"], "/pages/")

    registerAdminRoute("cmsWidgetGrid", ["GET"], "/widgets/");

    registerAdminRoute("imageUpload", ["POST"], "/image/upload/*");

    registerAdminRoute("fileBrowser", ["POST", "GET"], "/file_browser/*");

    registerAdminRoute("fileDelete", ["POST", "GET"], "/file_delete/*");

    registerAdminRoute("folderCreate", ["POST", "GET"], "/folder_create/*");

    registerAdminRoute("search", ["POST", "GET"], "/search");
}
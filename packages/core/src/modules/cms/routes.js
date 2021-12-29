module.exports = function ({ registerSiteRoute, registerAdminRoute }) {

    registerSiteRoute("notFound", ["GET"], "/notfound");

    registerSiteRoute("staticAsset", ["GET"], "/assets/*");

    registerSiteRoute("homepage", ["GET"], "/");

    registerSiteRoute("cmsPageView", ["GET"], "/page/:url_key");

    registerAdminRoute("adminStaticAsset", ["GET"], "/assets/*");

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
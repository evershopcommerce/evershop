const { getComponentSource } = require("../../../../../lib/helpers");
const { buildAdminUrl } = require("../../../../../lib/routie");
const { assign } = require("../../../../../lib/util/assign");

module.exports = (request, response) => {
    // Form
    if (request.params.id)
        response.addComponent(
            "createForm",
            "content",
            getComponentSource("cms/components/admin/page/edit/pageEditForm.js"),
            {
                id: "page-edit-form",
                method: "POST",
                action: buildAdminUrl("cmsPageSaveEdit", { "id": request.params.id }),
                gridUrl: buildAdminUrl("cmsPageGrid"),
                uploadApi: buildAdminUrl("imageUpload", [""])
            },
            10
        );
    else
        response.addComponent(
            "createForm",
            "content",
            getComponentSource("cms/components/admin/page/edit/pageEditForm.js"),
            {
                id: "page-edit-form",
                method: "POST",
                action: buildAdminUrl("cmsPageSaveNew"),
                gridUrl: buildAdminUrl("cmsPageGrid")
            },
            10
        );

    // General block
    response.addComponent(
        "pageEditGeneral",
        "left.side",
        getComponentSource("cms/components/admin/page/edit/general.js"),
        {
            browserApi: buildAdminUrl("fileBrowser", [""]),
            deleteApi: buildAdminUrl("fileDelete", [""]),
            uploadApi: buildAdminUrl("imageUpload", [""]),
            folderCreateApi: buildAdminUrl("folderCreate", [""])
        },
        10
    );

    // SEO block
    response.addComponent("pageEditSEO", "right.side", getComponentSource("cms/components/admin/page/edit/seo.js"), {}, 20);

    // Add uploadUrl to app context
    assign(response.context, { pageImageUploadUrl: buildAdminUrl("imageUpload", [""]) })
};
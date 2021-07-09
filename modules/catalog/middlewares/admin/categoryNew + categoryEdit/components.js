const { getComponentSource } = require("../../../../../lib/helpers");
const { buildAdminUrl } = require("../../../../../lib/routie");
const { assign } = require("../../../../../lib/util/assign");

module.exports = (request, response) => {
    // Form
    if (request.params.id)
        response.addComponent(
            "createForm",
            "content",
            getComponentSource("catalog/components/admin/category/edit/categoryEditForm.js"),
            {
                id: "category-edit-form",
                method: "POST",
                action: buildAdminUrl("categorySaveEdit", { "id": request.params.id }),
                gridUrl: buildAdminUrl("categoryGrid"),
                uploadApi: buildAdminUrl("imageUpload", [""])
            },
            10
        );
    else
        response.addComponent(
            "createForm",
            "content",
            getComponentSource("catalog/components/admin/category/edit/categoryEditForm.js"),
            {
                id: "category-edit-form",
                method: "POST",
                action: buildAdminUrl("categorySaveNew"),
                gridUrl: buildAdminUrl("categoryGrid")
            },
            10
        );

    // General block
    response.addComponent(
        "categoryEditGeneral",
        "left.side",
        getComponentSource("catalog/components/admin/category/edit/general.js"),
        {
            browserApi: buildAdminUrl("fileBrowser", [""]),
            deleteApi: buildAdminUrl("fileDelete", [""]),
            uploadApi: buildAdminUrl("imageUpload", [""]),
            folderCreateApi: buildAdminUrl("folderCreate", [""])
        },
        10
    );

    // SEO block
    response.addComponent("categoryEditSEO", "right.side", getComponentSource("catalog/components/admin/category/edit/seo.js"), {}, 20);

    // Add uploadUrl to app context
    assign(response.context, { categoryImageUploadUrl: buildAdminUrl("imageUpload", [""]) })
};
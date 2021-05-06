const { getComponentSource } = require("../../../../../lib/util");
const { buildAdminUrl } = require("../../../../../lib/routie");
const { assign } = require("../../../../../lib/util/assign");

module.exports = (request, response) => {
    // Form
    if (request.params.id)
        response.addComponent(
            "createForm",
            "content",
            getComponentSource("catalog/components/admin/product/edit/productEditForm.js"),
            {
                id: "product-edit-form",
                method: "POST",
                action: buildAdminUrl("productSaveEdit", { "id": request.params.id }),
                gridUrl: buildAdminUrl("productGrid"),
                uploadApi: buildAdminUrl("imageUpload", [""])
            },
            10
        );
    else
        response.addComponent(
            "createForm",
            "content",
            getComponentSource("catalog/components/admin/product/edit/productEditForm.js"),
            {
                id: "product-edit-form",
                method: "POST",
                action: buildAdminUrl("productSaveNew"),
                gridUrl: buildAdminUrl("productGrid")
            },
            10
        );

    // General block
    response.addComponent(
        "productEditGeneral",
        "left.side",
        getComponentSource("catalog/components/admin/product/edit/general.js"),
        {
            browserApi: buildAdminUrl("fileBrowser", [""]),
            deleteApi: buildAdminUrl("fileDelete", [""]),
            uploadApi: buildAdminUrl("imageUpload", [""]),
            folderCreateApi: buildAdminUrl("folderCreate", [""])
        },
        10
    );

    // SEO block
    response.addComponent("productEditSEO", "left.side", getComponentSource("catalog/components/admin/product/edit/seo.js"), {}, 20);


    // Attribute block
    response.addComponent("productEditAttribute", "right.side", getComponentSource("catalog/components/admin/product/edit/attributes.js"), {}, 10);

    // Inventory block
    response.addComponent("productEditInventory", "right.side", getComponentSource("catalog/components/admin/product/edit/inventory.js"), {}, 20);

    // Inventory block
    response.addComponent("productEditOptions", "left.side", getComponentSource("catalog/components/admin/product/edit/options.js"), {}, 50);

    // Image block
    response.addComponent("productEditImages", "left.side", getComponentSource("catalog/components/admin/product/edit/images.js"), {}, 30);

    // Variants block
    response.addComponent("productEditVariants", "left.side", getComponentSource("catalog/components/admin/product/edit/variants.js"), {}, 40);

    // Add uploadUrl to app context
    assign(response.context, { productImageUploadUrl: buildAdminUrl("imageUpload", [""]) })
    assign(response.context, { searchVariantUrl: buildAdminUrl("variantSearch", []) })
};
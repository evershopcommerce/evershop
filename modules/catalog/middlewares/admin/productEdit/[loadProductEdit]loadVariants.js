const { assign } = require('../../../../../lib/util/assign');
const { select } = require('@nodejscart/mysql-query-builder')
const { getConnection } = require('../../../../../lib/mysql/connection');
const { get } = require("../../../../../lib/util/get");
const uniqid = require("uniqid");
const { buildAdminUrl } = require("../../../../../lib/routie");

module.exports = async (request, response, stack) => {
    // Do nothing if this product does not belong to a variant group
    if (!get(response, "context.product.variant_group_id"))
        return;
    let connection = await getConnection();
    let query = select()
        .select("product_id", "variant_product_id")
        .select("sku")
        .select("status")
        .select("visibility")
        .select("price")
        .select("qty")
        .select("product.`image`")
        .select("product_image.`image`", "gallery")
        .from("product");

    query.leftJoin("product_image")
        .on("product.`product_id`", "=", "product_image.`product_image_product_id`");

    query.where("variant_group_id", "=", get(response, "context.product.variant_group_id"))
        .andWhere("product_id", "<>", get(response, "context.product.product_id"));

    let results = await query.execute(connection);

    let variants = [];
    results.forEach((variant, key) => {
        let index = variants.findIndex(v => v.variant_product_id === variant.variant_product_id);
        if (index === -1) {
            variants.push({ ...variant, images: [variant.image ? { url: buildAdminUrl("adminStaticAsset", [variant.image]), path: variant.image, id: uniqid() } : null, variant.gallery ? { url: buildAdminUrl("adminStaticAsset", [variant.gallery]), path: variant.gallery, id: uniqid() } : null].filter(i => i !== null) })
        } else {
            variants[index] = { ...variants[index], images: variants[index]["images"].concat({ url: buildAdminUrl("adminStaticAsset", [variant.gallery]), path: variant.gallery, id: uniqid() }) }
        }
    });

    for (let i = 0; i < variants.length; i++) {
        variants[i]["attributes"] = JSON.parse(JSON.stringify(await select()
            .from("product_attribute_value_index")
            .where("product_id", "=", variants[i]["variant_product_id"])
            .execute(connection)));
    }

    assign(response.context, {
        product: {
            variants: variants.map(v => ({
                ...v,
                id: `id${uniqid()}`
            }))
        }
    });

    let attributes = await select("attribute_id")
        .select("attribute_name")
        .from("attribute")
        .where(
            "attribute_id",
            "IN",
            Object.values(
                await select("attribute_one")
                    .from("variant_group")
                    .select("attribute_two")
                    .select("attribute_three")
                    .select("attribute_four")
                    .select("attribute_five")
                    .where("variant_group_id", "=", get(response, "context.product.variant_group_id"))
                    .load(connection)
            )
        ).execute(connection);

    assign(response.context, {
        product: {
            variantAttributes: await Promise.all(attributes.map(async a => {
                let options = await select()
                    .from("attribute_option")
                    .where("`attribute_id`", "=", a.attribute_id).execute(pool);
                return { ...a, options: options.map(o => { return { ...o } }) }
            }))
        }
    });
}
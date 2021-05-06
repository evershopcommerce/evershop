const { select } = require('../../../../../lib/mysql/query')
const { pool } = require('../../../../../lib/mysql/connection');

module.exports = async (request, response, stack, next) => {
    let query = select()
        .select("product_id", "variant_product_id")
        .select("sku")
        .select("name")
        .select("status")
        .select("price")
        .select("qty")
        .select("product.`image`")
        .select("product_image.`image`", "gallery")
        .from("product");

    query.leftJoin("product_image")
        .on("product.`product_id`", "=", "product_image.`product_image_product_id`");

    query.leftJoin("product_description")
        .on("product.`product_id`", "=", "product_description.`product_description_product_id`");

    // Only return item that not assigned to any group
    query.where("variant_group_id", "IS", null);

    if (request.query.keyword)
        query.andWhere("name", "LIKE", `%${request.query.keyword}%`)
            .or("sku", "LIKE", `%${request.query.keyword}%`);

    let results = await query.execute(pool);

    let variants = [];
    results.forEach((variant, key) => {
        let index = variants.findIndex(v => v.variant_product_id === variant.variant_product_id);
        if (index === -1) {
            variants.push({ ...variant, image: { url: variant.image }, images: [variant.image ? { url: variant.image, path: variant.image } : null, variant.gallery ? { url: variant.gallery, path: variant.gallery } : null].filter(i => i !== null) })
        } else {
            variants[index] = { ...variants[index], images: variants[index]["images"].concat({ url: variant.gallery, path: variant.gallery }) }
        }
    });

    for (let i = 0; i < variants.length; i++) {
        variants[i]["attributes"] = JSON.parse(JSON.stringify(await select()
            .from("product_attribute_value_index")
            .where("product_id", "=", variants[i]["variant_product_id"])
            .execute(pool)));
    }

    response.json({
        data: { variants: variants },
        success: true
    })
}
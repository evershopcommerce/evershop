const { select } = require('@nodejscart/mysql-query-builder')
const { pool } = require('../../../../../lib/mysql/connection');
const { get } = require("../../../../../lib/util/get");

module.exports = async (request, response, stack) => {
    // Wait for category to be fully loaded
    await stack["loadCategory"];
    let query = select("product_id")
        .select("sku")
        .select("price")
        .select("IF((qty>0 AND stock_availability = 1), 1, 0)", "isInStock")
        .select("name")
        .select("url_key")
        .select("image")
        .from("product");

    query.leftJoin("product_description")
        .on("product.`product_id`", "=", "product_description.`product_description_product_id`");

    query.where(
        "product.`product_id`",
        "IN",
        (await select("product_id")
            .from("product_category")
            .where("category_id", "=", get(response.context, "category.category_id")).execute(pool)
        ).map(r => r.product_id)
    ).and("status", "=", 1);

    return query;
}
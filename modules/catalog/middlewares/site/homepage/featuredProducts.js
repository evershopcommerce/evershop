const { select } = require('@nodejscart/mysql-query-builder')
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');
const { get } = require("../../../../../lib/util/get");
const path = require('path');
const fs = require('fs');
const { CONSTANTS } = require("../../../../../lib/helpers");
const config = require('config');
const { buildSiteUrl } = require("../../../../../lib/routie");

module.exports = async (request, response) => {
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

    query.where('status', '=', 1);
    query.limit(0, 4);

    let products = await query.execute(pool);
    for (let i = 0; i < products.length; i++) {
        // Build Image url
        if (products[i]["image"]) {
            let list = products[i]["image"].replace(/.([^.]*)$/, '-list.$1');
            products[i]["image"] = {
                url: fs.existsSync(path.join(CONSTANTS.PUBLICPATH, list)) ? `/assets${list}` : null
            }
        }

        if (products[i]["url_key"]) {
            products[i]["url"] = buildSiteUrl("productView", { url_key: products[i]["url_key"] });
        } else {
            products[i]["url"] = buildSiteUrl("productView", { url_key: products[i]["product_id"] });
        }
    }
    assign(response.context, { featuredProducts: JSON.parse(JSON.stringify(products)) });
}
const { assign } = require("../../../../../lib/util/assign");
const { pool } = require('../../../../../lib/mysql/connection');
const { buildSiteUrl } = require("../../../../../lib/routie");
const path = require('path');
const fs = require('fs');
const { CONSTANTS } = require("../../../../../lib/helpers");
const config = require('config');

module.exports = async (request, response, stack) => {
    let query = await stack["productsQueryInit"];
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
    assign(response.context, { category: { products: JSON.parse(JSON.stringify(products)) } });
}
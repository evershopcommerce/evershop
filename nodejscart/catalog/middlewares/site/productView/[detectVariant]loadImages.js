const { select } = require("../../../../../lib/mysql/query")
const { pool } = require("../../../../../lib/mysql/connection");
const { assign } = require("../../../../../lib/util/assign");
const { get } = require("../../../../../lib/util/get");
const path = require('path');
const fs = require('fs');
const { CONSTANTS } = require("../../../../../lib/util");
const config = require('config');

module.exports = async (request, response, stack, next) => {
    // Wait for product to be fully loaded
    await stack["detectVariant"];
    let gallery = [];
    let product = get(response, "context.product");
    try {
        if (product.image) {
            let thumb = product.image.replace(/.([^.]*)$/, '-thumb.$1');
            let single = product.image.replace(/.([^.]*)$/, '-single.$1');
            gallery.push({
                thumb: fs.existsSync(path.join(CONSTANTS.PUBLICPATH, thumb)) ? `/assets${thumb}` : `/assets/theme/site${config.get("catalog.product.image.placeHolder")}`,
                single: fs.existsSync(path.join(CONSTANTS.PUBLICPATH, single)) ? `/assets${single}` : `/assets/theme/site${config.get("catalog.product.image.placeHolder")}`,
                original: fs.existsSync(path.join(CONSTANTS.PUBLICPATH, product.image)) ? `/assets${product.image}` : `/assets/theme/site${config.get("catalog.product.image.placeHolder")}`
            });
        } else {
            gallery.push({
                thumb: `/assets/theme/site${config.get("catalog.product.image.placeHolder")}`,
                single: `/assets/theme/site${config.get("catalog.product.image.placeHolder")}`,
                original: `/assets/theme/site${config.get("catalog.product.image.placeHolder")}`
            });
        }

        let query = select();
        query.from("product_image")
            .where("product_image_product_id", "=", product.product_id);

        let images = await query.execute(pool);
        for (var i = 0, len = images.length; i < len; ++i) {
            let thumb = images[i]["image"].replace(/.([^.]*)$/, '-thumb.$1');
            let single = images[i]["image"].replace(/.([^.]*)$/, '-single.$1');
            gallery.push({
                thumb: fs.existsSync(path.join(CONSTANTS.PUBLICPATH, thumb)) ? `/assets${thumb}` : `/assets/theme/site${config.get("catalog.product.image.placeHolder")}`,
                single: fs.existsSync(path.join(CONSTANTS.PUBLICPATH, single)) ? `/assets${single}` : `/assets/theme/site${config.get("catalog.product.image.placeHolder")}`,
                original: fs.existsSync(path.join(CONSTANTS.PUBLICPATH, images[i]["image"])) ? `/assets${images[i]["image"]}` : `/public/theme/site${config.get("catalog.product.image.placeHolder")}`
            });
        }
        assign(response.context.product, { gallery: gallery })
        next();
    } catch (e) {
        next(e);
    }
}
const { select } = require('@evershop/mysql-query-builder');
const path = require('path');
const fs = require('fs');
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');
const { CONSTANTS } = require('../../../../../lib/helpers');
const { buildUrl } = require('../../../../../lib/router/buildUrl');

module.exports = async (request, response) => {
  const query = select('product.`product_id`')
    .select('product.`sku`')
    .select('product.`price`')
    .select('product_description.`name`')
    .select('product_description.`url_key`')
    .select('product.`image`')
    .select('SUM(cart_item.`qty`)', 'soldQty')
    .from('product');
  query.leftJoin('product_description')
    .on('product.`product_id`', '=', 'product_description.`product_description_product_id`');
  query.leftJoin('cart_item')
    .on('cart_item.`product_id`', '=', 'product.`product_id`');
  query.where('product.`status`', '=', 1);
  query.groupBy('product.`product_id`');
  query.orderBy('soldQty', 'desc');
  query.limit(0, 4);

  const products = await query.execute(pool);
  for (let i = 0; i < products.length; i += 1) {
    // Build Image url
    if (products[i].image) {
      const list = products[i].image.replace(/.([^.]*)$/, '-list.$1');
      products[i].image = {
        url: fs.existsSync(path.join(CONSTANTS.MEDIAPATH, list)) ? `/assets${list}` : null
      };
    }

    if (products[i].url_key) {
      products[i].url = buildUrl('productView', { url_key: products[i].url_key });
    } else {
      products[i].url = buildUrl('productView', { url_key: products[i].product_id });
    }
  }
  assign(response.context, { featuredProducts: JSON.parse(JSON.stringify(products)) });
};

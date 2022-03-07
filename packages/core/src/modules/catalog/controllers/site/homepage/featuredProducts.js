const { select } = require('@nodejscart/mysql-query-builder');
const path = require('path');
const fs = require('fs');
const { pool } = require('../../../../../lib/mysql/connection');
const { CONSTANTS } = require('../../../../../lib/helpers');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { setPageData } = require('../../../../../lib/util/setPageData');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response) => {
  const query = select('product_id')
    .select('sku')
    .select('price')
    .select('IF((qty>0 AND stock_availability = 1), 1, 0)', 'isInStock')
    .select('name')
    .select('url_key')
    .select('image')
    .from('product');

  query.leftJoin('product_description')
    .on('product.`product_id`', '=', 'product_description.`product_description_product_id`');

  query.where('status', '=', 1);
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
  setPageData('featuredProducts', JSON.parse(JSON.stringify(products)));
};

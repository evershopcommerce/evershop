const path = require('path');
const fs = require('fs');
const { assign } = require('../../../../../lib/util/assign');
const { pool } = require('../../../../../lib/mysql/connection');
const { buildUrl } = require('../../../../../lib/router/buildUrl');
const { CONSTANTS } = require('../../../../../lib/helpers');

module.exports = async (request, response, stack) => {
  const query = await stack.productsQueryInit;
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
  assign(response.context, { category: { products: JSON.parse(JSON.stringify(products)) } });
};

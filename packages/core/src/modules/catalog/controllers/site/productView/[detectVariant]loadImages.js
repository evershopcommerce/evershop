const { select } = require('@nodejscart/mysql-query-builder');
const path = require('path');
const fs = require('fs');
const config = require('config');
const { pool } = require('../../../../../lib/mysql/connection');
const { assign } = require('../../../../../lib/util/assign');
const { get } = require('../../../../../lib/util/get');
const { CONSTANTS } = require('../../../../../lib/helpers');

module.exports = async (request, response, stack, next) => {
  // Wait for product to be fully loaded
  await stack.detectVariant;
  const gallery = [];
  const product = get(response, 'context.product');
  try {
    if (product.image) {
      const thumb = product.image.replace(/.([^.]*)$/, '-thumb.$1');
      const single = product.image.replace(/.([^.]*)$/, '-single.$1');
      gallery.push({
        thumb: fs.existsSync(path.join(CONSTANTS.MEDIAPATH, thumb)) ? `/assets${thumb}` : `/assets/theme/site${config.get('catalog.product.image.placeHolder')}`,
        single: fs.existsSync(path.join(CONSTANTS.MEDIAPATH, single)) ? `/assets${single}` : `/assets/theme/site${config.get('catalog.product.image.placeHolder')}`,
        original: fs.existsSync(path.join(CONSTANTS.MEDIAPATH, product.image)) ? `/assets${product.image}` : `/assets/theme/site${config.get('catalog.product.image.placeHolder')}`
      });
    } else {
      gallery.push({
        thumb: `/assets/theme/site${config.get('catalog.product.image.placeHolder')}`,
        single: `/assets/theme/site${config.get('catalog.product.image.placeHolder')}`,
        original: `/assets/theme/site${config.get('catalog.product.image.placeHolder')}`
      });
    }

    const query = select();
    query.from('product_image')
      .where('product_image_product_id', '=', product.product_id);

    const images = await query.execute(pool);
    for (let i = 0, len = images.length; i < len; i += 1) {
      const thumb = images[i].image.replace(/.([^.]*)$/, '-thumb.$1');
      const single = images[i].image.replace(/.([^.]*)$/, '-single.$1');
      gallery.push({
        thumb: fs.existsSync(path.join(CONSTANTS.MEDIAPATH, thumb)) ? `/assets${thumb}` : `/assets/theme/site${config.get('catalog.product.image.placeHolder')}`,
        single: fs.existsSync(path.join(CONSTANTS.MEDIAPATH, single)) ? `/assets${single}` : `/assets/theme/site${config.get('catalog.product.image.placeHolder')}`,
        original: fs.existsSync(path.join(CONSTANTS.MEDIAPATH, images[i].image)) ? `/assets${images[i].image}` : `/public/theme/site${config.get('catalog.product.image.placeHolder')}`
      });
    }
    assign(response.context.product, { gallery });
    next();
  } catch (e) {
    next(e);
  }
};

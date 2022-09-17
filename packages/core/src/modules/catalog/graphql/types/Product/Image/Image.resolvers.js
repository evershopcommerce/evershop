const fs = require('fs');
const path = require('path');
const { select } = require('@evershop/mysql-query-builder');
const { CONSTANTS } = require('../../../../../../lib/helpers');
const { getConfig } = require('../../../../../../lib/util/getConfig');

function getUrls(image) {
  const thumbVersion = image.replace(/.([^.]*)$/, '-thumb.$1');
  const singleVersion = image.replace(/.([^.]*)$/, '-single.$1');
  const listingVersion = image.replace(/.([^.]*)$/, '-list.$1');
  const thumb = fs.existsSync(path.join(CONSTANTS.MEDIAPATH, thumbVersion)) ? `/assets${thumbVersion}` : `/assets/theme/site${getConfig('catalog.product.image.placeHolder')}`;
  const single = fs.existsSync(path.join(CONSTANTS.MEDIAPATH, singleVersion)) ? `/assets${singleVersion}` : `/assets/theme/site${getConfig('catalog.product.image.placeHolder')}`;
  const listing = fs.existsSync(path.join(CONSTANTS.MEDIAPATH, listingVersion)) ? `/assets${listingVersion}` : `/assets/theme/site${getConfig('catalog.product.image.placeHolder')}`;
  return {
    thumb,
    single,
    listing,
  };
}

module.exports = {
  Product: {
    image: async (product, _, { pool }) => {
      const mainImage = product['image'] || '';
      const urls = getUrls(mainImage);
      return {
        ...urls,
        alt: product['name'],
      };
    },
    gallery: async (product, _, { pool }) => {
      const gallery = await select()
        .from('product_image')
        .where('product_image_product_id', '=', product.product_id)
        .execute(pool);
      return gallery.map((image) => {
        const urls = getUrls(image.image || '');
        return {
          ...urls,
          alt: product['name'],
        };
      });
    }
  }
}
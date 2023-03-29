const fs = require('fs');
const path = require('path');
const { select } = require('@evershop/postgres-query-builder');
const uniqid = require('uniqid');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

function getUrls(image) {
  const thumbVersion = image.replace(/.([^.]*)$/, '-thumb.$1');
  const singleVersion = image.replace(/.([^.]*)$/, '-single.$1');
  const listingVersion = image.replace(/.([^.]*)$/, '-list.$1');
  const thumb = fs.existsSync(path.join(CONSTANTS.MEDIAPATH, thumbVersion))
    ? `/assets${thumbVersion}`
    : `/assets/theme/frontStore${getConfig(
        'catalog.product.image.placeHolder'
      )}`;
  const single = fs.existsSync(path.join(CONSTANTS.MEDIAPATH, singleVersion))
    ? `/assets${singleVersion}`
    : `/assets/theme/frontStore${getConfig(
        'catalog.product.image.placeHolder'
      )}`;
  const listing = fs.existsSync(path.join(CONSTANTS.MEDIAPATH, listingVersion))
    ? `/assets${listingVersion}`
    : `/assets/theme/frontStore${getConfig(
        'catalog.product.image.placeHolder'
      )}`;
  const origin = fs.existsSync(path.join(CONSTANTS.MEDIAPATH, image))
    ? `/assets${image}`
    : `/assets/theme/frontStore${getConfig(
        'catalog.product.image.placeHolder'
      )}`;
  return {
    thumb,
    single,
    listing,
    origin
  };
}

module.exports = {
  Product: {
    image: async (product) => {
      const mainImage = product.image || '';
      const urls = getUrls(mainImage);
      return mainImage
        ? {
            ...urls,
            alt: product.name,
            path: mainImage,
            uniqueId: uniqid()
          }
        : null;
    },
    gallery: async (product, _, { pool }) => {
      const gallery = await select()
        .from('product_image')
        .where('product_image_product_id', '=', product.productId)
        .execute(pool);
      return gallery.map((image) => {
        const urls = getUrls(image.image || '');
        return {
          id: image.product_image_id,
          ...urls,
          alt: product.name,
          path: image.image,
          uniqueId: uniqid()
        };
      });
    }
  }
};

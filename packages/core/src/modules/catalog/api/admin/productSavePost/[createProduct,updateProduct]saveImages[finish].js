const { insert, del, update } = require('@evershop/mysql-query-builder');
const sharp = require('sharp');
const config = require('config');
const path = require('path');
const { get } = require('../../../../../lib/util/get');
const { CONSTANTS } = require('../../../../../lib/helpers');

module.exports = async (request, response, stack) => {
  const gallery = get(request, 'body.productMainImages', []);

  // Wait for product saving to be completed
  const promises = [stack.createProduct, stack.updateProduct];
  const results = await Promise.all(promises);

  let productId = results[0] ? results[0].insertId : results[1];
  const connection = await stack.getConnection;
  // eslint-disable-next-line no-useless-catch
  try {
    // Delete all old images
    await del('product_image')
      .where('product_image_product_id', '=', productId)
      .execute(connection);

    if (gallery.length > 0) {
      const mainImage = gallery.shift();
      const mediaPath = path.join(CONSTANTS.MEDIAPATH, mainImage);
      const ext = path.extname(path.resolve(CONSTANTS.MEDIAPATH, mainImage));
      // Generate thumbnail
      await sharp(mediaPath)
        .resize(
          config.get('catalog.product.image.thumbnail.width'),
          config.get('catalog.product.image.thumbnail.height'),
          { fit: 'inside' }
        )
        .toFile(mediaPath.replace(
          ext,
          `-thumb${ext}`
        ));

      // Generate listing
      await sharp(mediaPath)
        .resize(
          config.get('catalog.product.image.listing.width'),
          config.get('catalog.product.image.listing.height'),
          { fit: 'inside' }
        )
        .toFile(mediaPath.replace(
          ext,
          `-list${ext}`
        ));

      // Generate single
      await sharp(mediaPath)
        .resize(
          config.get('catalog.product.image.single.width'),
          config.get('catalog.product.image.single.height'),
          { fit: 'inside' }
        )
        .toFile(mediaPath.replace(
          ext,
          `-single${ext}`
        ));

      await update('product')
        .given({ image: mainImage })
        .where('product_id', '=', productId)
        .execute(connection);
    }

    await Promise.all(gallery.map((f) => (async () => {
      const mediaPath = path.join(CONSTANTS.MEDIAPATH, f);
      const ext = path.extname(path.resolve(CONSTANTS.MEDIAPATH, f));

      // Generate thumbnail
      await sharp(mediaPath)
        .resize(
          config.get('catalog.product.image.thumbnail.width'),
          config.get('catalog.product.image.thumbnail.height'),
          { fit: 'inside' }
        )
        .toFile(mediaPath.replace(
          ext,
          `-thumb${ext}`
        ));

      // Generate listing
      await sharp(mediaPath)
        .resize(
          config.get('catalog.product.image.listing.width'),
          config.get('catalog.product.image.listing.height'),
          { fit: 'inside' }
        )
        .toFile(mediaPath.replace(
          ext,
          `-list${ext}`
        ));

      // Generate single
      await sharp(mediaPath)
        .resize(
          config.get('catalog.product.image.single.width'),
          config.get('catalog.product.image.single.height'),
          { fit: 'inside' }
        )
        .toFile(mediaPath.replace(
          ext,
          `-single${ext}`
        ));

      await insert('product_image')
        .given({ image: f })
        .prime('product_image_product_id', productId)
        .execute(connection);
    })()));
  } catch (e) {
    // TODO: Log an error here
    throw e;
  }
};

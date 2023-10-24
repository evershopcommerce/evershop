const { insert, del } = require('@evershop/postgres-query-builder');
const { get } = require('@evershop/evershop/src/lib/util/get');

module.exports = async (request, response, delegate) => {
  const gallery = get(request, 'body.images', []);
  const productId = await delegate.updateProduct;
  const connection = await delegate.getConnection;
  // eslint-disable-next-line no-useless-catch
  try {
    // Delete all old images
    await del('product_image')
      .where('product_image_product_id', '=', productId)
      .execute(connection);
    // gallery = gallery.filter((image) => {
    //   const mediaPath = path.join(CONSTANTS.MEDIAPATH, image);
    //   return image && existsSync(mediaPath);
    // });

    // if (gallery.length > 0) {
    //   const mainImage = gallery.shift();
    //   // const mediaPath = path.join(CONSTANTS.MEDIAPATH, mainImage);
    //   // const ext = path.extname(path.resolve(CONSTANTS.MEDIAPATH, mainImage));
    //   // // Generate thumbnail
    //   // if (existsSync(mediaPath)) {
    //   //   await sharp(mediaPath)
    //   //     .resize(
    //   //       config.get('catalog.product.image.thumbnail.width'),
    //   //       config.get('catalog.product.image.thumbnail.height'),
    //   //       { fit: 'inside' }
    //   //     )
    //   //     .toFile(mediaPath.replace(ext, `-thumb${ext}`));

    //   //   // Generate listing
    //   //   await sharp(mediaPath)
    //   //     .resize(
    //   //       config.get('catalog.product.image.listing.width'),
    //   //       config.get('catalog.product.image.listing.height'),
    //   //       { fit: 'inside' }
    //   //     )
    //   //     .toFile(mediaPath.replace(ext, `-list${ext}`));

    //   //   // Generate single
    //   //   await sharp(mediaPath)
    //   //     .resize(
    //   //       config.get('catalog.product.image.single.width'),
    //   //       config.get('catalog.product.image.single.height'),
    //   //       { fit: 'inside' }
    //   //     )
    //   //     .toFile(mediaPath.replace(ext, `-single${ext}`));
    //   // }

    //   await update('product')
    //     .given({ image: mainImage })
    //     .where('product_id', '=', productId)
    //     .execute(connection);
    // }

    await Promise.all(
      gallery.map((f, index) =>
        (async () => {
          // const mediaPath = path.join(CONSTANTS.MEDIAPATH, f);
          // const ext = path.extname(path.resolve(CONSTANTS.MEDIAPATH, f));
          // if (existsSync(mediaPath)) {
          //   // Generate thumbnail
          //   await sharp(mediaPath)
          //     .resize(
          //       config.get('catalog.product.image.thumbnail.width'),
          //       config.get('catalog.product.image.thumbnail.height'),
          //       { fit: 'inside' }
          //     )
          //     .toFile(mediaPath.replace(ext, `-thumb${ext}`));

          //   // Generate listing
          //   await sharp(mediaPath)
          //     .resize(
          //       config.get('catalog.product.image.listing.width'),
          //       config.get('catalog.product.image.listing.height'),
          //       { fit: 'inside' }
          //     )
          //     .toFile(mediaPath.replace(ext, `-list${ext}`));

          //   // Generate single
          //   await sharp(mediaPath)
          //     .resize(
          //       config.get('catalog.product.image.single.width'),
          //       config.get('catalog.product.image.single.height'),
          //       { fit: 'inside' }
          //     )
          //     .toFile(mediaPath.replace(ext, `-single${ext}`));
          // }
          await insert('product_image')
            .given({ image: f })
            .prime('product_image_product_id', productId)
            .prime('is_main', index === 0)
            .execute(connection);
        })()
      )
    );
  } catch (e) {
    // TODO: Log an error here
    throw e;
  }
};

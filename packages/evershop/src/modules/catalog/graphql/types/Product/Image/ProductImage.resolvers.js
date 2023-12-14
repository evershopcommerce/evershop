const { v4: uuidv4 } = require('uuid');
const { select } = require('@evershop/postgres-query-builder');

module.exports = {
  Product: {
    image: async (product) => {
      const mainImage = product.originImage;
      return mainImage
        ? {
            thumb: product.thumbImage || null,
            single: product.singleImage || null,
            listing: product.listingImage || null,
            alt: product.name,
            url: mainImage,
            uuid: uuidv4(),
            origin: mainImage
          }
        : null;
    },
    gallery: async (product, _, { pool }) => {
      const gallery = await select()
        .from('product_image')
        .where('product_image_product_id', '=', product.productId)
        .and('is_main', '=', false)
        .execute(pool);
      return gallery.map((image) => ({
        id: image.product_image_id,
        alt: product.name,
        url: image.origin_image,
        uuid: uuidv4(),
        origin: image.origin_image,
        thumb: image.thumb_image,
        single: image.single_image,
        listing: image.listing_image
      }));
    }
  }
};

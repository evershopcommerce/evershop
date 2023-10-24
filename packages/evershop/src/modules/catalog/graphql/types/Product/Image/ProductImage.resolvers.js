const { v4: uuidv4 } = require('uuid');
const { select } = require('@evershop/postgres-query-builder');

function getVariants(image) {
  const variant = image.variant || {};
  return {
    thumb: variant.thumb || null,
    single: variant.single || null,
    listing: variant.listing || null
  };
}

module.exports = {
  Product: {
    image: async (product) => {
      const mainImage = product.image || '';
      const variants = getVariants(mainImage);
      return mainImage
        ? {
            ...variants,
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
      return gallery.map((image) => {
        const variants = getVariants(image);
        return {
          id: image.product_image_id,
          ...variants,
          alt: product.name,
          url: image.image,
          uuid: uuidv4(),
          origin: image.image
        };
      });
    }
  }
};

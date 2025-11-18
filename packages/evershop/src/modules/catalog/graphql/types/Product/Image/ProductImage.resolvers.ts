import { select } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';

export default {
  Product: {
    image: async (product) => {
      return product.originImage
        ? {
            alt: product.name,
            url: product.originImage,
            uuid: uuidv4(),
            origin: product.originImage
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
        origin: image.origin_image
      }));
    }
  }
};

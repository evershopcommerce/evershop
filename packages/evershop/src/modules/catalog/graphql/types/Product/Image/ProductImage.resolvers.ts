import { select } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { normalizePort } from '../../../../../../bin/lib/normalizePort.js';
import { getConfig } from '../../../../../../lib/util/getConfig.js';

export default {
  Product: {
    image: async (product) => {
      const port = normalizePort();
      const baseUrl = getConfig('shop.homeUrl', `http://localhost:${port}`);
      const mainImage = `${baseUrl}${product.originImage}`;
      return mainImage
        ? {
            alt: product.name,
            url:
              product.originImage && product.originImage.startsWith('http')
                ? product.originImage
                : mainImage,
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
      const port = normalizePort();
      const baseUrl = getConfig('shop.homeUrl', `http://localhost:${port}`);
      return gallery.map((image) => ({
        id: image.product_image_id,
        alt: product.name,
        url: `${baseUrl}${image.origin_image}`,
        uuid: uuidv4(),
        origin: image.origin_image
      }));
    }
  }
};

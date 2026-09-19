import { camelCase } from '../../../../../../lib/util/camelCase.js';
import { getProductsBaseQuery } from '../../../../services/getProductsBaseQuery.js';

/**
 * Product hero resolver. Resolves the picked product uuid → full product
 * record so the storefront query can fan it out into the standard Product
 * fields (price, image, variantGroup, ...). When the uuid doesn't resolve,
 * `product` is null and the storefront renders an empty placeholder.
 */
export default {
  Query: {
    productHeroWidget: async (
      _,
      {
        productUuid,
        image,
        imageAlt,
        imageWidth,
        imageHeight,
        eyebrow,
        copy,
        imagePosition
      },
      { pool }
    ) => {
      const safePosition = imagePosition === 'right' ? 'right' : 'left';
      const w = Number(imageWidth);
      const h = Number(imageHeight);
      let product = null;
      if (productUuid) {
        const query = getProductsBaseQuery();
        query.where('product.uuid', '=', productUuid);
        const result = await query.load(pool);
        if (result) product = camelCase(result);
      }
      return {
        productUuid: productUuid || null,
        image: image || null,
        imageAlt: imageAlt || '',
        imageWidth: Number.isFinite(w) && w > 0 ? Math.round(w) : null,
        imageHeight: Number.isFinite(h) && h > 0 ? Math.round(h) : null,
        eyebrow: eyebrow || null,
        copy: copy || null,
        imagePosition: safePosition,
        product
      };
    }
  }
};

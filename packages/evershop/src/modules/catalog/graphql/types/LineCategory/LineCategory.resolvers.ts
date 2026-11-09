import { select } from '@evershop/postgres-query-builder';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { getCategoriesBaseQuery } from '../../../services/getCategoriesBaseQuery.js';

/**
 * A cart or order line's category, for the storefront's commerce events
 * (GA4 item_category on every ecommerce event, not only view_item). The same
 * row as Product.category, so Category's own resolvers apply.
 */
async function loadCategory(categoryId: unknown, pool) {
  const id = Number(categoryId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  const query = getCategoriesBaseQuery();
  query.where('category_id', '=', id);
  const category = await query.load(pool);
  return category ? camelCase(category) : null;
}

/** The product's current category id, null when the product was deleted */
async function productCategoryId(productId: unknown, pool) {
  const product = await select('category_id')
    .from('product')
    .where('product_id', '=', productId)
    .load(pool);
  return product?.category_id ?? null;
}

export default {
  CartItem: {
    // The cart's Item field registry already has the product's category_id
    category: async (
      { categoryId, productId }: { categoryId?: unknown; productId?: unknown },
      _,
      { pool }
    ) =>
      loadCategory(
        categoryId !== undefined
          ? categoryId
          : await productCategoryId(productId, pool),
        pool
      )
  },
  OrderItem: {
    // order_item keeps no category: the product's category now
    category: async ({ productId }: { productId?: unknown }, _, { pool }) =>
      loadCategory(await productCategoryId(productId, pool), pool)
  }
};

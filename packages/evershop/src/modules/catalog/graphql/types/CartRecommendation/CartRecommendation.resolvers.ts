import { camelCase } from '../../../../../lib/util/camelCase.js';
import { resolveCartCrossSellProducts } from '../../../services/recommendation/resolveCartCrossSellProducts.js';

/**
 * The Cart parent is `camelCase(cart.exportData())` — SHALLOW camelCase, so
 * `parent.items` still carry the Item field registry's snake_case keys
 * (product_id). The checkout module's own Cart.items resolver camelCases
 * each item separately for the same reason.
 */

function clampLimit(limit: unknown, fallback: number): number {
  const parsed = parseInt(String(limit), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(25, Math.max(1, parsed));
}

export default {
  Cart: {
    crossSellProducts: async (
      cart: { items?: Array<{ product_id?: number }> },
      { limit }: { limit?: number },
      { pool }: { pool: any }
    ) => {
      const productIds = (cart.items || [])
        .map((item) => Number(item?.product_id))
        .filter((id) => Number.isInteger(id) && id > 0);
      const rows = await resolveCartCrossSellProducts(
        productIds,
        clampLimit(limit, 4),
        pool
      );
      return rows.map((row) => camelCase(row));
    }
  }
};

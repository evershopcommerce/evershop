import { camelCase } from '../../../../../../lib/util/camelCase.js';
import { resolveCrossSellProducts } from '../../../../services/recommendation/resolveCrossSellProducts.js';
import { resolveRelatedProducts } from '../../../../services/recommendation/resolveRelatedProducts.js';
import { resolveUpsellProducts } from '../../../../services/recommendation/resolveUpsellProducts.js';

/**
 * Thin wrappers over the resolution services (spec § 8.1). The services
 * re-load the anchor by id — the parent row may come from a slim query
 * (featuredProducts) that lacks the recommendation columns. Limit clamped
 * defensively beyond the widget AJV bounds.
 */

function clampLimit(limit: unknown, fallback: number): number {
  const parsed = parseInt(String(limit), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(25, Math.max(1, parsed));
}

export default {
  Product: {
    relatedProducts: async (
      product: { productId: number },
      { limit }: { limit?: number },
      { pool }: { pool: any }
    ) => {
      const rows = await resolveRelatedProducts(
        product.productId,
        clampLimit(limit, 5),
        pool
      );
      return rows.map((row) => camelCase(row));
    },
    crossSellProducts: async (
      product: { productId: number },
      { limit }: { limit?: number },
      { pool }: { pool: any }
    ) => {
      const rows = await resolveCrossSellProducts(
        product.productId,
        clampLimit(limit, 4),
        pool
      );
      return rows.map((row) => camelCase(row));
    },
    upsellProducts: async (
      product: { productId: number },
      { limit }: { limit?: number },
      { pool }: { pool: any }
    ) => {
      const rows = await resolveUpsellProducts(
        product.productId,
        clampLimit(limit, 4),
        pool
      );
      return rows.map((row) => camelCase(row));
    }
  }
};

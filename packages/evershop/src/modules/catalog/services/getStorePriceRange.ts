import { pool as appPool } from '../../../lib/postgres/connection.js';
import { PoolLike } from './recommendation/applyRecommendationGating.js';

export interface StorePriceRange {
  min: number;
  max: number;
}

/**
 * Lowest and highest price across the storefront-visible catalog, for the
 * `/products` price slider bounds.
 *
 * Unlike the category page's `priceRange` resolver, this applies `status` and
 * `visibility` — otherwise a disabled or hidden product silently widens the
 * slider to a price no shopper can reach. (The category variant does not, which
 * is a known inconsistency; fixing it there is a separate behavior change.)
 *
 * It deliberately does NOT respond to the active filters: a range that shrinks
 * as you drag its own handles is disorienting.
 *
 * Returns zeros for an empty catalog rather than nulls, so the caller never has
 * to branch.
 */
export async function getStorePriceRange(
  pool: PoolLike = appPool as unknown as PoolLike
): Promise<StorePriceRange> {
  const { rows } = await pool.query(
    `SELECT MIN(product.price) AS min, MAX(product.price) AS max
     FROM product
     WHERE product.status = true
       AND product.visibility = true`
  );

  const row = rows[0] ?? {};
  return {
    // MIN/MAX over a numeric column come back as strings from pg, and as null
    // when nothing matched.
    min: row.min === null || row.min === undefined ? 0 : parseFloat(row.min),
    max: row.max === null || row.max === undefined ? 0 : parseFloat(row.max)
  };
}

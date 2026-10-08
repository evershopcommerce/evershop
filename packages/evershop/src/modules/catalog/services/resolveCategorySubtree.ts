import { pool as appPool } from '../../../lib/postgres/connection.js';
import { PoolLike } from './recommendation/applyRecommendationGating.js';

/**
 * Expand category ids to themselves plus every descendant.
 *
 * Resolved in Node and returned as a plain array, NOT inlined into the calling
 * query as a subquery. That is deliberate and was measured: Postgres cannot
 * estimate a recursive CTE's cardinality (it guessed 511 rows for a 37-row
 * subtree), so a `category_id IN (WITH RECURSIVE …)` predicate makes the planner
 * abandon `PRODUCT_CATEGORY_ID_INDEX` and sequential-scan `product` instead —
 * a flat ~80ms COUNT at every selectivity on a 300k catalog, against 2.4ms when
 * the same ids arrive as an array (32x on a narrow category).
 *
 * This is NOT the id-round-trip anti-pattern from
 * `wiki/large-catalog-performance.md`. That one is about unbounded **product**
 * id lists — hundreds of thousands of them, which blow up the query builder's
 * per-parameter binding loop and then hit the wire protocol's 65,535 parameter
 * limit. A category tree is bounded: hundreds of rows, one array parameter.
 * The same wiki page recommends exactly this shape, and
 * `getProductsByCategoryBaseQuery` has always used it.
 */
export async function resolveCategorySubtree(
  categoryIds: number[],
  pool: PoolLike = appPool as unknown as PoolLike
): Promise<number[]> {
  const seeds = categoryIds.filter((id) => Number.isInteger(id) && id > 0);
  if (seeds.length === 0) {
    return [];
  }
  const { rows } = await pool.query(
    `WITH RECURSIVE sub_categories AS (
      SELECT category_id FROM category WHERE category_id = ANY($1::int[])
      UNION
      SELECT c.category_id FROM category c
      INNER JOIN sub_categories sc ON c.parent_id = sc.category_id
    ) SELECT category_id FROM sub_categories`,
    [seeds]
  );
  return rows.map((row) => row.category_id as number);
}

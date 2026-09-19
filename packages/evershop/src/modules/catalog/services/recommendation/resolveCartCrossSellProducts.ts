import { pool as appPool } from '../../../../lib/postgres/connection.js';
import {
  CandidateRow,
  PoolLike,
  REP_MAP_JOIN,
  SqlParams,
  queryDisplayableCandidates
} from './applyRecommendationGating.js';
import {
  CrossSellGates,
  queryCoPurchaseCandidates,
  readCrossSellGates,
  resolveDisplayMembers
} from './resolveCrossSellProducts.js';

/**
 * Cart-page FBT (specifications/06 D-W1-1..5): aggregate co-purchase
 * candidates across ALL cart items. Deliberately NO manual tier —
 * cross_sell_mode and picks are per-product state; a cart of N items has no
 * single mode. Tiers:
 *
 *   1. co-purchase candidates over the SET of cart representatives (one row
 *      per candidate: MAX(lift), then anchors-matched, then total pairs);
 *   2. fallback ladder (same `crossSellFallbackEnabled` setting): bestsellers
 *      in ANY of the cart's categories, then store bestsellers.
 *
 * Everything already in the cart — including variant SIBLINGS of cart items
 * — is excluded: all cart representative keys seed `excludedRepKeys`.
 * Cart lines hold variant-level product ids while product_relation is keyed
 * by representatives, so lines are rep-resolved first (one batch query);
 * missing/deleted lines simply drop out, they never abort the shelf.
 */
export async function resolveCartCrossSellProducts(
  productIds: number[],
  limit: number,
  pool: PoolLike = appPool as unknown as PoolLike,
  gates: CrossSellGates = readCrossSellGates()
): Promise<CandidateRow[]> {
  const lineIds = [...new Set(productIds)].filter(
    (id) => Number.isInteger(id) && id > 0
  );
  if (!lineIds.length || limit < 1) {
    return [];
  }

  const lines = await pool.query(
    `SELECT COALESCE(rep_map.rep, s.product_id) AS rep, s.category_id
     FROM product s
     ${REP_MAP_JOIN}
     WHERE s.product_id = ANY($1)`,
    [lineIds]
  );
  const cartReps = [
    ...new Set(lines.rows.map((row: { rep: number }) => Number(row.rep)))
  ];
  const cartCategoryIds = [
    ...new Set(
      lines.rows
        .map((row: { category_id: number | null }) => row.category_id)
        .filter((id: number | null): id is number => id !== null)
    )
  ];
  if (!cartReps.length) {
    return [];
  }

  const picked: CandidateRow[] = [];
  const excludedRepKeys = [...cartReps];
  const take = (rows: CandidateRow[], source: string) => {
    for (const row of rows) {
      row.source = source;
      picked.push(row);
      excludedRepKeys.push(row.rep_key);
    }
  };

  // Over-fetch like the PDP shelf: candidate groups with no displayable
  // member yield their slot to the next-best candidate.
  const remaining = () => limit - picked.length;
  const candidates = await queryCoPurchaseCandidates(
    pool,
    cartReps,
    gates,
    excludedRepKeys,
    remaining() * 4
  );
  take(await resolveDisplayMembers(pool, candidates, remaining()), 'co_purchase');

  if (picked.length < limit && gates.fallbackEnabled) {
    if (cartCategoryIds.length) {
      const params = new SqlParams();
      take(
        await queryDisplayableCandidates(pool, {
          params,
          sourcePredicate: `product.category_id = ANY(${params.add(cartCategoryIds)})`,
          excludedRepKeys,
          limit: remaining()
        }),
        'category_bestsellers'
      );
    }
    if (picked.length < limit) {
      const params = new SqlParams();
      take(
        await queryDisplayableCandidates(pool, {
          params,
          sourcePredicate: 'TRUE',
          excludedRepKeys,
          limit: remaining()
        }),
        'store_bestsellers'
      );
    }
  }

  return picked;
}

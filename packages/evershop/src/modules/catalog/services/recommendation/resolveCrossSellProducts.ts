import { pool as appPool } from '../../../../lib/postgres/connection.js';
import {
  getCrossSellFallbackEnabled,
  getCrossSellMinAnchorOrders,
  getCrossSellMinLift,
  getCrossSellMinPairCount
} from '../recommendationSettings.js';
import {
  buildRepMembershipPredicate,
  CandidateRow,
  PoolLike,
  queryDisplayableCandidates,
  SqlParams
} from './applyRecommendationGating.js';
import {
  loadRecommendationAnchor,
  queryManualPicks
} from './resolveRelatedProducts.js';

/**
 * Frequently-bought-together resolution (spec § 7.4):
 *
 *   1. modes 'manual_only' / 'manual_first' render the manual prefix
 *      (product_link type 'cross_sell'); 'manual_only' stops there;
 *      'auto' ignores manual picks entirely;
 *   2. co-purchase candidates from product_relation, gated on pair count,
 *      anchor order count, and lift — ranked lift DESC (confidence alone
 *      converges every list onto store bestsellers);
 *   3. fallback ladder (setting-gated): same-category bestsellers, then
 *      store bestsellers — an empty slot has zero revenue.
 *
 * The automatic tier is group-consistent (§ 7.6): every sibling PDP maps to
 * the same representative key. Manual picks and the mode are per variant —
 * deliberately (representative election is recompute-time state; per-variant
 * accessories are a feature).
 */

export interface CrossSellGates {
  minPairCount: number;
  minAnchorOrders: number;
  minLift: number;
  fallbackEnabled: boolean;
}

export function readCrossSellGates(): CrossSellGates {
  return {
    minPairCount: getCrossSellMinPairCount(),
    minAnchorOrders: getCrossSellMinAnchorOrders(),
    minLift: getCrossSellMinLift(),
    fallbackEnabled: getCrossSellFallbackEnabled()
  };
}

/**
 * Gated co-purchase candidates for a SET of anchor representatives, best
 * affinity first (specifications/06 D-W1-2/D-W1-3). Every pair row is gated
 * individually (per-anchor order count, per-pair lift with the NULLIF
 * zero-denominator guard), then candidates aggregate one row per
 * related_product_id: MAX(lift) DESC — strongest single affinity wins —
 * then how many anchors matched, then total co-purchases, then id.
 *
 * For a single anchor the aggregate degenerates to exactly the original
 * per-pair ranking (MAX/SUM over one row = the row; COUNT(*) = 1 ties):
 * pinned by the single-anchor FBT tests, which predate this refactor.
 *
 * Returns representative keys only — display members resolve separately, so
 * candidates whose group has no displayable member simply yield their slot
 * to the next candidate.
 */
export async function queryCoPurchaseCandidates(
  pool: PoolLike,
  anchorRepKeys: number[],
  gates: CrossSellGates,
  excludedRepKeys: number[],
  limit: number
): Promise<number[]> {
  if (!anchorRepKeys.length) {
    return [];
  }
  const result = await pool.query(
    `SELECT r.related_product_id AS rep_key
     FROM product_relation r
     INNER JOIN product_stat sa ON sa.product_id = r.product_id
     INNER JOIN product_stat sb ON sb.product_id = r.related_product_id
     CROSS JOIN product_stat_meta m
     WHERE r.product_id = ANY($1)
       AND r.co_purchase_count >= $2
       AND sa.order_count >= $3
       AND (r.co_purchase_count::float * m.total_order_count)
           / NULLIF(sa.order_count::bigint * sb.order_count, 0) > $4
       AND NOT (r.related_product_id = ANY($5))
     GROUP BY r.related_product_id
     ORDER BY MAX((r.co_purchase_count::float * m.total_order_count)
                  / NULLIF(sa.order_count::bigint * sb.order_count, 0)) DESC,
              COUNT(*) DESC,
              SUM(r.co_purchase_count) DESC,
              r.related_product_id
     LIMIT $6`,
    [
      anchorRepKeys,
      gates.minPairCount,
      gates.minAnchorOrders,
      gates.minLift,
      excludedRepKeys,
      limit
    ]
  );
  return result.rows.map((row: { rep_key: number }) => row.rep_key);
}

/**
 * § 7.6 display-member resolution: candidate set S = the whole variant group
 * (queryDisplayableCandidates computes the § 6.6 policy over S and returns
 * one displayable row per representative — max-ID visible member first via
 * the visibility-then-id ordering). Groups with no displayable member are
 * simply absent. Rows come back in candidate (lift) order.
 */
export async function resolveDisplayMembers(
  pool: PoolLike,
  repKeys: number[],
  limit: number
): Promise<CandidateRow[]> {
  if (!repKeys.length) {
    return [];
  }
  const params = new SqlParams();
  const rows = await queryDisplayableCandidates(pool, {
    params,
    sourcePredicate: await buildRepMembershipPredicate(pool, params, repKeys),
    orderBy: '_vis DESC, product_id DESC',
    excludedRepKeys: [],
    limit: repKeys.length
  });
  const byRep = new Map(rows.map((row) => [Number(row.rep_key), row]));
  const ordered: CandidateRow[] = [];
  for (const key of repKeys) {
    const row = byRep.get(Number(key));
    if (row) {
      ordered.push(row);
    }
    if (ordered.length >= limit) {
      break;
    }
  }
  return ordered;
}

export async function resolveCrossSellProducts(
  productId: number,
  limit: number,
  pool: PoolLike = appPool as unknown as PoolLike,
  gates: CrossSellGates = readCrossSellGates()
): Promise<CandidateRow[]> {
  const anchor = await loadRecommendationAnchor(pool, productId);
  if (!anchor) {
    return [];
  }
  const anchorRep = anchor.rep_key;
  const picked: CandidateRow[] = [];
  const excludedRepKeys = [anchorRep];
  const take = (rows: CandidateRow[], source: string) => {
    for (const row of rows) {
      row.source = source;
      picked.push(row);
      excludedRepKeys.push(row.rep_key);
    }
  };

  if (anchor.cross_sell_mode !== 'auto') {
    if (anchor.has_cross_sell_links) {
      take(
        await queryManualPicks(
          pool,
          anchor,
          'cross_sell',
          excludedRepKeys,
          limit
        ),
        'manual'
      );
    }
    if (anchor.cross_sell_mode === 'manual_only' || picked.length >= limit) {
      return picked;
    }
  }

  // Over-fetch candidates: a candidate group with no displayable member
  // yields its slot to the next-best candidate rather than shortening the shelf.
  const remaining = () => limit - picked.length;
  const candidates = await queryCoPurchaseCandidates(
    pool,
    [anchorRep],
    gates,
    excludedRepKeys,
    remaining() * 4
  );
  take(await resolveDisplayMembers(pool, candidates, remaining()), 'co_purchase');

  if (picked.length < limit && gates.fallbackEnabled) {
    if (anchor.category_id) {
      const params = new SqlParams();
      take(
        await queryDisplayableCandidates(pool, {
          params,
          sourcePredicate: `product.category_id = ${params.add(anchor.category_id)}`,
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

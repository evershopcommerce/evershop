import { pool as appPool } from '../../../../lib/postgres/connection.js';
import type { RelatedProductsRulesConfig } from '../recommendationSettings.js';
import {
  CandidateRow,
  PoolLike,
  SqlParams,
  queryDisplayableCandidates
} from './applyRecommendationGating.js';
import {
  loadRecommendationAnchor,
  resolveEffectiveRelatedRules,
  rulePredicate
} from './resolveRelatedProducts.js';

/**
 * Upsell resolution (specifications/06 D-W1-8, as amended 2026-07-16): a
 * DERIVED shelf — the anchor's effective related-products rules (product
 * custom → category → global, § 6.3) re-run with the price constrained to
 * STRICTLY ABOVE the anchor. No manual tier, no bestseller fallback: the
 * shelf shows genuine pricier rule matches or nothing at all.
 *
 * Price semantics: `price > anchor.price`; when the config's price band is
 * enabled its percent becomes the UPPER cap (anchor < price ≤ anchor·(1+P%))
 * — the band's lower half is meaningless for an upgrades shelf.
 *
 * `related_products_mode = 'manual_only'` renders nothing here: that mode is
 * the merchant's opt-out of rule-driven recommendations for the product, and
 * this shelf is 100% rule-driven.
 */

function priceAbovePredicate(
  params: SqlParams,
  anchorPrice: number,
  config: RelatedProductsRulesConfig
): string {
  const lo = params.add(anchorPrice);
  const percent = config.priceBand?.enabled ? config.priceBand.percent : null;
  if (percent) {
    const hi = params.add(anchorPrice * (1 + percent / 100));
    return `product.price > ${lo} AND product.price <= ${hi}`;
  }
  return `product.price > ${lo}`;
}

export async function resolveUpsellProducts(
  productId: number,
  limit: number,
  pool: PoolLike = appPool as unknown as PoolLike
): Promise<CandidateRow[]> {
  const anchor = await loadRecommendationAnchor(pool, productId);
  if (!anchor || anchor.related_products_mode === 'manual_only') {
    return [];
  }
  const { config } = resolveEffectiveRelatedRules(anchor);
  if (!config.enabled) {
    return [];
  }
  const anchorPrice = parseFloat(anchor.price);
  if (!Number.isFinite(anchorPrice)) {
    return [];
  }

  const picked: CandidateRow[] = [];
  const excludedRepKeys = [anchor.rep_key];
  for (const rule of config.rules) {
    if (picked.length >= limit) {
      break;
    }
    if (!rule || rule.enabled !== true) {
      continue;
    }
    const params = new SqlParams();
    const predicate = await rulePredicate(pool, params, anchor, rule);
    if (!predicate) {
      continue;
    }
    const above = priceAbovePredicate(params, anchorPrice, config);
    const rows = await queryDisplayableCandidates(pool, {
      params,
      sourcePredicate: `${predicate} AND ${above}`,
      excludedRepKeys,
      limit: limit - picked.length
    });
    for (const row of rows) {
      row.source = rule.type;
      picked.push(row);
      excludedRepKeys.push(row.rep_key);
    }
  }
  return picked;
}

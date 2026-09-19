import { pool as appPool } from '../../../../lib/postgres/connection.js';
import {
  getGlobalRelatedProductsRules,
  isUsableRulesConfig,
  RelatedProductsRule,
  RelatedProductsRulesConfig,
  sanitizeRulesConfig
} from '../recommendationSettings.js';
import {
  CandidateRow,
  PoolLike,
  queryDisplayableCandidates,
  SqlParams
} from './applyRecommendationGating.js';

/**
 * Related-products resolution (spec § 6.3, normative). Waterfall:
 *
 *   1. manual prefix — product_link(type='related') in pin order, ALWAYS
 *      first, in every mode;
 *   2. mode 'manual_only' stops; config.enabled = false stops (enabled gates
 *      the automatic tiers only);
 *   3. enabled rules in array order, each filling only the remaining slots;
 *   4. store-bestsellers fallback rung (config.fallbackToBestsellers).
 *
 * Config tiers (§ 6.3): product custom → category override → global setting;
 * NULL/invalid entries fall through — a stored-state problem must degrade,
 * never throw on a PDP.
 *
 * Dedup identity everywhere is the representative key (§ 7.2): the anchor's
 * own group is excluded up front ("same color" must not surface the anchor's
 * siblings — the PDP already shows them as variant options), and every
 * source excludes the representatives already picked.
 */

export interface AnchorRow {
  product_id: number;
  variant_group_id: number | null;
  category_id: number | null;
  price: string;
  related_products_mode: 'inherit' | 'custom' | 'manual_only';
  related_products_rules: unknown;
  cross_sell_mode: 'auto' | 'manual_only' | 'manual_first';
  category_rules: unknown;
  rep_key: number;
  has_related_links: boolean;
  has_cross_sell_links: boolean;
}

/**
 * The anchor is re-loaded by id rather than trusted from the GraphQL parent:
 * parent rows from slim queries (e.g. featuredProducts) lack the
 * recommendation columns, and a missing column reading as undefined would
 * silently resolve the wrong tier. Everything the § 13 query budget charges
 * to "anchor overhead" is folded into this ONE query: the category-tier
 * rules, the representative key, and whether manual links exist at all (so
 * the manual-prefix query is skipped on the vast majority of PDPs).
 */
export async function loadRecommendationAnchor(
  pool: PoolLike,
  productId: number
): Promise<AnchorRow | null> {
  const result = await pool.query(
    `SELECT product.product_id, product.variant_group_id, product.category_id,
            product.price, product.related_products_mode,
            product.related_products_rules, product.cross_sell_mode,
            category.related_products_rules AS category_rules,
            COALESCE(
              (SELECT MIN(p2.product_id) FROM product p2
               WHERE p2.variant_group_id = product.variant_group_id),
              product.product_id
            ) AS rep_key,
            EXISTS (SELECT 1 FROM product_link pl
                    WHERE pl.product_id = product.product_id
                      AND pl.type = 'related') AS has_related_links,
            EXISTS (SELECT 1 FROM product_link pl
                    WHERE pl.product_id = product.product_id
                      AND pl.type = 'cross_sell') AS has_cross_sell_links
     FROM product
     LEFT JOIN category ON category.category_id = product.category_id
     WHERE product.product_id = $1`,
    [productId]
  );
  return result.rows[0] || null;
}

/**
 * § 6.3 config resolution with provenance — the admin card's source badge
 * (`recommendationStatus.relatedRulesSource`, § 8.2) shows exactly this.
 */
export function resolveEffectiveRelatedRules(anchor: AnchorRow): {
  config: RelatedProductsRulesConfig;
  source: 'product' | 'category' | 'global';
} {
  if (
    anchor.related_products_mode === 'custom' &&
    isUsableRulesConfig(anchor.related_products_rules)
  ) {
    return {
      config: sanitizeRulesConfig(anchor.related_products_rules),
      source: 'product'
    };
  }
  if (isUsableRulesConfig(anchor.category_rules)) {
    return {
      config: sanitizeRulesConfig(anchor.category_rules),
      source: 'category'
    };
  }
  return { config: getGlobalRelatedProductsRules(), source: 'global' };
}

function priceBandPredicate(
  params: SqlParams,
  anchor: AnchorRow,
  config: RelatedProductsRulesConfig
): string {
  const percent = config.priceBand?.enabled ? config.priceBand.percent : null;
  const anchorPrice = parseFloat(anchor.price);
  if (!percent || !Number.isFinite(anchorPrice)) {
    return 'TRUE';
  }
  const lo = params.add(anchorPrice * (1 - percent / 100));
  const hi = params.add(anchorPrice * (1 + percent / 100));
  return `product.price BETWEEN ${lo} AND ${hi}`;
}

/** Scope predicate shared by same_category / same_collection / attribute scope. */
function scopePredicate(
  params: SqlParams,
  anchor: AnchorRow,
  scope: 'same_category' | 'same_collection'
): string | null {
  if (scope === 'same_category') {
    if (!anchor.category_id) {
      return null; // anchor unscoped → rule yields nothing, waterfall continues
    }
    return `product.category_id = ${params.add(anchor.category_id)}`;
  }
  return `EXISTS (
    SELECT 1 FROM product_collection pc
    WHERE pc.product_id = product.product_id
      AND pc.collection_id IN (
        SELECT collection_id FROM product_collection
        WHERE product_id = ${params.add(anchor.product_id)}
      )
  )`;
}

/**
 * Build the WHERE predicate for one rule, or null when the rule cannot match
 * anything for this anchor (missing category, no attribute values, …).
 * Exported for resolveUpsellProducts, which runs the same rules with a
 * price-above constraint instead of the symmetric band.
 */
export async function rulePredicate(
  pool: PoolLike,
  params: SqlParams,
  anchor: AnchorRow,
  rule: RelatedProductsRule
): Promise<string | null> {
  if (rule.type === 'same_category' || rule.type === 'same_collection') {
    return scopePredicate(params, anchor, rule.type);
  }
  // same_attribute_values — select-type attributes only (§ 6.1), always
  // intersected with its scope; attributes the anchor has no value for are
  // skipped, and if all are skipped the rule yields nothing. Array.isArray:
  // stored rules pass only the shallow isUsableRulesConfig check, and a
  // malformed rule item must degrade to "yields nothing", never throw on a
  // PDP (a thrown resolver fails the whole page query).
  const codes = Array.isArray(rule.attributeCodes)
    ? rule.attributeCodes.filter((code) => typeof code === 'string' && code)
    : [];
  const scope = rule.scope;
  if (!codes.length || (scope !== 'same_category' && scope !== 'same_collection')) {
    return null;
  }
  const scoped = scopePredicate(params, anchor, scope);
  if (!scoped) {
    return null;
  }
  const anchorValues = await pool.query(
    `SELECT pavi.attribute_id, pavi.option_id
     FROM product_attribute_value_index pavi
     INNER JOIN attribute a ON a.attribute_id = pavi.attribute_id
     WHERE pavi.product_id = $1
       AND pavi.option_id IS NOT NULL
       AND a.type = 'select'
       AND a.attribute_code = ANY($2)`,
    [anchor.product_id, codes]
  );
  if (!anchorValues.rows.length) {
    return null;
  }
  const matches = anchorValues.rows.map(
    (row: { attribute_id: number; option_id: number }) => `EXISTS (
      SELECT 1 FROM product_attribute_value_index pavi
      WHERE pavi.product_id = product.product_id
        AND pavi.attribute_id = ${params.add(row.attribute_id)}
        AND pavi.option_id = ${params.add(row.option_id)}
    )`
  );
  return `${scoped} AND ${matches.join(' AND ')}`;
}

/**
 * Manual picks, expanded to the pick's whole variant group: the § 6.6 policy
 * then runs with S = the group, so a pinned invisible variant resolves to
 * its displayable sibling (or the carve-out member) instead of linking a
 * product the shopper couldn't reach — identical semantics to FBT
 * display-member resolution. Pin order ranks between picks; visibility then
 * max-id picks the member within a group.
 */
async function queryManualPicks(
  pool: PoolLike,
  anchor: AnchorRow,
  type: 'related' | 'cross_sell',
  excludedRepKeys: number[],
  limit: number
): Promise<CandidateRow[]> {
  const params = new SqlParams();
  return queryDisplayableCandidates(pool, {
    params,
    fromSql: `product_link pl
      INNER JOIN product target ON target.product_id = pl.linked_product_id
      INNER JOIN product ON (
        product.product_id = target.product_id
        OR (target.variant_group_id IS NOT NULL
            AND product.variant_group_id = target.variant_group_id)
      )`,
    extraSelect: 'pl.sort_order AS _o1, pl.product_link_id AS _o2',
    sourcePredicate: `pl.product_id = ${params.add(anchor.product_id)}
      AND pl.type = ${params.add(type)}`,
    orderBy: '_o1 ASC, _o2 ASC, _vis DESC, product_id DESC',
    excludedRepKeys,
    limit
  });
}

export { queryManualPicks };

export async function resolveRelatedProducts(
  productId: number,
  limit: number,
  pool: PoolLike = appPool as unknown as PoolLike
): Promise<CandidateRow[]> {
  const anchor = await loadRecommendationAnchor(pool, productId);
  if (!anchor) {
    return [];
  }
  const picked: CandidateRow[] = [];
  const excludedRepKeys = [anchor.rep_key];
  const take = (rows: CandidateRow[], source: string) => {
    for (const row of rows) {
      row.source = source;
      picked.push(row);
      excludedRepKeys.push(row.rep_key);
    }
  };

  if (anchor.has_related_links) {
    take(
      await queryManualPicks(pool, anchor, 'related', excludedRepKeys, limit),
      'manual'
    );
  }
  if (anchor.related_products_mode === 'manual_only' || picked.length >= limit) {
    return picked;
  }

  const { config } = resolveEffectiveRelatedRules(anchor);
  if (!config.enabled) {
    return picked;
  }

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
    const band = priceBandPredicate(params, anchor, config);
    take(
      await queryDisplayableCandidates(pool, {
        params,
        sourcePredicate: `${predicate} AND ${band}`,
        excludedRepKeys,
        limit: limit - picked.length
      }),
      rule.type
    );
  }

  if (picked.length < limit && config.fallbackToBestsellers !== false) {
    const params = new SqlParams();
    take(
      await queryDisplayableCandidates(pool, {
        params,
        sourcePredicate: 'TRUE',
        excludedRepKeys,
        limit: limit - picked.length
      }),
      'bestsellers_fallback'
    );
  }

  return picked;
}

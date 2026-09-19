import { getShowOutOfStockProducts } from '../catalogSettings.js';

/**
 * Shared SQL building blocks for the recommendation resolution services
 * (spec § 6.5, § 6.6). These are raw-SQL fragments rather than query-builder
 * nodes: the § 6.6 visibility policy needs window functions over the
 * candidate set and the dedup needs representative-key partitioning —
 * shapes the builder cannot express. Every fragment is either literal SQL or
 * parameter placeholders; no caller data is ever interpolated.
 *
 * The display column set mirrors featuredProducts
 * (FeaturedProduct.resolvers.js): Product field resolvers fill in
 * price/image/url from these columns, so recommendation rows are drop-in
 * `[Product]` items.
 */

/** SELECT list for display rows. Requires the § JOINS fragment aliases. */
export const RECOMMENDATION_DISPLAY_COLUMNS = `
  product.product_id,
  product.uuid,
  product.sku,
  product.price,
  product.variant_group_id,
  product.category_id,
  product.image,
  product_description.product_description_id,
  product_description.name,
  product_description.url_key`;

/** Joins the display columns and the stock gate depend on. */
export const RECOMMENDATION_DISPLAY_JOINS = `
  LEFT JOIN product_description
    ON product_description.product_description_product_id = product.product_id
  INNER JOIN product_inventory
    ON product_inventory.product_inventory_product_id = product.product_id`;

/**
 * Non-visibility § 6.5 gating: enabled, not excluded, in stock (when the
 * store hides out-of-stock products). Visibility is deliberately NOT here —
 * it is the § 6.6 policy, applied over a candidate set via the window
 * fragments below.
 */
export function baseRecommendationGatingSql(): string {
  const clauses = [
    `product.status = TRUE`,
    `product.exclude_from_recommendation = FALSE`
  ];
  if (getShowOutOfStockProducts() === false) {
    clauses.push(
      `(product_inventory.manage_stock = FALSE
        OR (product_inventory.qty > 0 AND product_inventory.stock_availability = TRUE))`
    );
  }
  return clauses.join('\n    AND ');
}

/**
 * § 6.6 displayability, computed over whatever candidate set S the enclosing
 * CTE defines (rule matches for related rules; the whole variant group for
 * FBT display members and manual picks):
 *
 *   1. visible products pass;
 *   2. an invisible member of a group with variant_group.visibility = 't'
 *      passes only when NO member of the group within S is visible AND it is
 *      the MAX(product_id) member within S — mirroring the core carve-out
 *      (ProductCollection.js:64-98) exactly.
 *
 * The partition key falls back to -product_id for ungrouped rows: PARTITION
 * BY a NULL group column would lump every ungrouped product into one
 * partition and corrupt the bool_or/MAX.
 *
 * Requires `LEFT JOIN variant_group ON variant_group.variant_group_id =
 * product.variant_group_id` in the enclosing CTE.
 */
export const VISIBILITY_POLICY_WINDOW_COLUMNS = `
  product.visibility AS _vis,
  variant_group.visibility AS _grp_vis,
  bool_or(product.visibility)
    OVER (PARTITION BY COALESCE(product.variant_group_id, -product.product_id)) AS _any_vis,
  MAX(product.product_id)
    OVER (PARTITION BY COALESCE(product.variant_group_id, -product.product_id)) AS _max_id`;

/**
 * WHERE predicate over a candidate CTE aliased `s` that selected the window
 * columns above (`s.`-qualified: the joined product_stat also has a
 * product_id column).
 */
export const VISIBILITY_POLICY_PREDICATE = `
  (s._vis = TRUE OR (s._grp_vis = TRUE AND s._any_vis = FALSE AND s.product_id = s._max_id))`;

/**
 * Representative-key map (§ 7.2): MIN(product_id) of the current variant
 * group. Join against a candidate row set aliased `s`; the key expression is
 * `COALESCE(rep_map.rep, s.product_id)`.
 */
export const REP_MAP_JOIN = `
  LEFT JOIN (
    SELECT variant_group_id, MIN(product_id) AS rep
    FROM product
    WHERE variant_group_id IS NOT NULL
    GROUP BY variant_group_id
  ) rep_map ON rep_map.variant_group_id = s.variant_group_id`;

/**
 * Resolve a product's representative key (§ 7.2) — one index-only scan on
 * "FK_PRODUCT_VARIANT_GROUP" when grouped.
 */
export async function resolveRepresentativeKey(
  pool: PoolLike,
  productId: number,
  variantGroupId: number | null
): Promise<number> {
  if (!variantGroupId) {
    return productId;
  }
  const result = await pool.query(
    'SELECT MIN(product_id) AS rep FROM product WHERE variant_group_id = $1',
    [variantGroupId]
  );
  return result.rows[0]?.rep ?? productId;
}

/** Minimal pg-compatible pool surface, injectable for the scratch-DB tests. */
export interface PoolLike {
  query: (
    text: string,
    values?: unknown[]
  ) => Promise<{ rows: any[]; rowCount: number | null }>;
}

/**
 * A gated, displayable recommendation row (snake_case, pre-camelCase).
 * Field-resolver contract: Product.image reads originImage (product_image
 * join — NOT the legacy product.image column), and Product.inventory
 * computes isInStock from qty/manageStock/stockAvailability on the parent
 * row without querying — all of those must therefore be selected here.
 */
export interface CandidateRow {
  product_id: number;
  uuid: string;
  sku: string;
  price: string;
  variant_group_id: number | null;
  category_id: number | null;
  origin_image: string | null;
  qty: number;
  manage_stock: boolean;
  stock_availability: boolean;
  product_description_id: number | null;
  name: string | null;
  url_key: string | null;
  rep_key: number;
  /** Group-level eligible-order count (product_stat via representative). */
  sales_rank: number;
  /** Which waterfall rung produced the row — set by the resolution drivers. */
  source?: string;
}

/**
 * Indexable "member of any of these representative keys" predicate. The naive
 * form — computing COALESCE(MIN(sibling id), product_id) for EVERY product row
 * and comparing to the key list — is a seq scan with a correlated subquery
 * per row (~100ms on a 2k catalog, § 13 bench). Resolving the reps' group ids
 * first turns it into two ANY() probes on the product PK and
 * "FK_PRODUCT_VARIANT_GROUP".
 */
export async function buildRepMembershipPredicate(
  pool: PoolLike,
  params: SqlParams,
  repKeys: number[]
): Promise<string> {
  if (!repKeys.length) {
    return 'FALSE';
  }
  const reps = await pool.query(
    'SELECT product_id, variant_group_id FROM product WHERE product_id = ANY($1)',
    [repKeys]
  );
  const groupIds = reps.rows
    .filter((row: { variant_group_id: number | null }) => row.variant_group_id !== null)
    .map((row: { variant_group_id: number }) => row.variant_group_id);
  const singleIds = reps.rows
    .filter((row: { variant_group_id: number | null }) => row.variant_group_id === null)
    .map((row: { product_id: number }) => row.product_id);
  return `(product.product_id = ANY(${params.add(singleIds)})
        OR product.variant_group_id = ANY(${params.add(groupIds)}))`;
}

/** Collects bind values and hands out $n placeholders. */
export class SqlParams {
  private values: unknown[] = [];

  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }

  all(): unknown[] {
    return this.values;
  }
}

/**
 * The one query shape every recommendation source runs through (§ 6.3
 * waterfall rules, the manual prefix, both fallback rungs):
 *
 *   s      — candidate set S: source predicate + non-visibility § 6.5 gating,
 *            with the § 6.6 window columns computed over S;
 *   d      — § 6.6 displayability + representative key + sales rank, minus
 *            already-excluded representatives (anchor group + earlier picks);
 *   ranked — one displayable row per representative (best-ranked first);
 *   final  — display columns, ordered, limited.
 *
 * `fromSql` defaults to bare `product`; sources joining extra tables (the
 * manual prefix joins product_link) extend it and may add ordering columns
 * (`extraSelect`) referenced by `orderBy`.
 */
export async function queryDisplayableCandidates(
  pool: PoolLike,
  opts: {
    params: SqlParams;
    /** SQL predicate over the aliases in `fromSql`; parameters via `params`. */
    sourcePredicate: string;
    /** Extra SELECT items for CTE `s` (e.g. `pl.sort_order AS _o1`). */
    extraSelect?: string;
    /** FROM clause; must expose a `product` alias. Defaults to `product`. */
    fromSql?: string;
    /** ORDER BY items over CTE `d` columns. Default: sales rank. */
    orderBy?: string;
    /** Representative keys to exclude (anchor group + already picked). */
    excludedRepKeys: number[];
    limit: number;
  }
): Promise<CandidateRow[]> {
  const { params } = opts;
  const orderBy = opts.orderBy || '_sales DESC, product_id DESC';
  // The final ORDER BY prefixes each item with "ranked."; only bare
  // "column ASC|DESC" items survive that transformation, so anything else
  // (function calls, expressions) must fail loudly here, not as a runtime
  // 42601 on a PDP.
  for (const part of orderBy.split(',')) {
    if (!/^[a-z0-9_]+ (ASC|DESC)$/i.test(part.trim())) {
      throw new Error(
        `Unsupported orderBy item "${part.trim()}" — bare "column ASC|DESC" only`
      );
    }
  }
  const excludedPh = params.add(opts.excludedRepKeys);
  const limitPh = params.add(opts.limit);
  const sql = `
    WITH s AS (
      SELECT
        product.product_id,
        product.uuid,
        product.sku,
        product.price,
        product.variant_group_id,
        product.category_id,
        product_inventory.qty,
        product_inventory.manage_stock,
        product_inventory.stock_availability,
        ${opts.extraSelect ? `${opts.extraSelect},` : ''}
        ${VISIBILITY_POLICY_WINDOW_COLUMNS}
      FROM ${opts.fromSql || 'product'}
      INNER JOIN product_inventory
        ON product_inventory.product_inventory_product_id = product.product_id
      LEFT JOIN variant_group
        ON variant_group.variant_group_id = product.variant_group_id
      WHERE (${opts.sourcePredicate})
        AND ${baseRecommendationGatingSql()}
    ),
    d AS (
      SELECT s.*,
             COALESCE(rep_map.rep, s.product_id) AS rep_key,
             COALESCE(ps.order_count, 0) AS _sales
      FROM s
      ${REP_MAP_JOIN}
      LEFT JOIN product_stat ps
        ON ps.product_id = COALESCE(rep_map.rep, s.product_id)
      WHERE ${VISIBILITY_POLICY_PREDICATE}
        AND NOT (COALESCE(rep_map.rep, s.product_id) = ANY(${excludedPh}))
    ),
    ranked AS (
      SELECT d.*,
             ROW_NUMBER() OVER (PARTITION BY rep_key ORDER BY ${orderBy}) AS _rn
      FROM d
    )
    SELECT ranked.product_id, ranked.uuid, ranked.sku, ranked.price,
           ranked.variant_group_id, ranked.category_id,
           ranked.qty, ranked.manage_stock, ranked.stock_availability,
           pimg.origin_image,
           pd.product_description_id, pd.name, pd.url_key,
           ranked.rep_key,
           ranked._sales AS sales_rank
    FROM ranked
    LEFT JOIN product_description pd
      ON pd.product_description_product_id = ranked.product_id
    LEFT JOIN product_image pimg
      ON pimg.product_image_product_id = ranked.product_id
      AND pimg.is_main = TRUE
    WHERE ranked._rn = 1
    ORDER BY ${orderBy
      .split(',')
      .map((part) => `ranked.${part.trim()}`)
      .join(', ')}
    LIMIT ${limitPh}`;
  const result = await pool.query(sql, params.all());
  return result.rows;
}

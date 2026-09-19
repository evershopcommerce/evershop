import { camelCase } from '../../../../../../lib/util/camelCase.js';
import {
  buildRepMembershipPredicate,
  PoolLike,
  queryDisplayableCandidates,
  SqlParams
} from '../../../../services/recommendation/applyRecommendationGating.js';
import {
  readCrossSellGates,
  resolveCrossSellProducts
} from '../../../../services/recommendation/resolveCrossSellProducts.js';
import {
  loadRecommendationAnchor,
  resolveEffectiveRelatedRules,
  resolveRelatedProducts
} from '../../../../services/recommendation/resolveRelatedProducts.js';
import {
  getCrossSellFallbackEnabled,
  getCrossSellMinAnchorOrders,
  getCrossSellMinLift,
  getCrossSellMinPairCount,
  getGlobalRelatedProductsRules,
  isUsableRulesConfig,
  sanitizeRulesConfig
} from '../../../../services/recommendationSettings.js';

/**
 * Admin diagnostics + config surface (spec § 8.2). Parents may come from slim
 * queries, so anything beyond the raw columns re-loads the anchor by id — a
 * per-parent WeakMap memo keeps that at one query per product per request
 * even though GraphQL calls each field resolver separately.
 */

type Anchor = NonNullable<Awaited<ReturnType<typeof loadRecommendationAnchor>>>;

const anchorMemo = new WeakMap<object, Promise<Anchor | null>>();

function getAnchor(
  parent: { productId: number },
  pool: PoolLike
): Promise<Anchor | null> {
  let promise = anchorMemo.get(parent);
  if (!promise) {
    promise = loadRecommendationAnchor(pool, parent.productId);
    anchorMemo.set(parent, promise);
  }
  return promise;
}

async function requireAnchor(
  parent: { productId: number },
  pool: PoolLike
): Promise<Anchor> {
  const anchor = await getAnchor(parent, pool);
  if (!anchor) {
    throw new Error(`Product ${parent.productId} no longer exists`);
  }
  return anchor;
}

/**
 * Ungated product rows for admin display (the diagnostics must SHOW hidden
 * candidates/picks). Carries the same columns the storefront rows do so
 * Product field resolvers (image → originImage, inventory → qty/…) work.
 */
async function loadBareProducts(
  pool: PoolLike,
  productIds: number[]
): Promise<Map<number, Record<string, unknown>>> {
  if (!productIds.length) {
    return new Map();
  }
  const result = await pool.query(
    `SELECT product.product_id, product.uuid, product.sku, product.price,
            product.status, product.visibility, product.variant_group_id,
            product.category_id,
            product_inventory.qty, product_inventory.manage_stock,
            product_inventory.stock_availability,
            pimg.origin_image,
            pd.product_description_id, pd.name, pd.url_key
     FROM product
     LEFT JOIN product_inventory
       ON product_inventory.product_inventory_product_id = product.product_id
     LEFT JOIN product_description pd
       ON pd.product_description_product_id = product.product_id
     LEFT JOIN product_image pimg
       ON pimg.product_image_product_id = product.product_id
       AND pimg.is_main = TRUE
     WHERE product.product_id = ANY($1)`,
    [productIds]
  );
  return new Map(
    result.rows.map((row: { product_id: number }) => [
      row.product_id,
      camelCase(row)
    ])
  );
}

function toRulesConfig(value: unknown) {
  // sanitize: the SDL promises non-null item fields; a malformed item written
  // out-of-band must drop, not null the whole Product via the non-null chain.
  return isUsableRulesConfig(value) ? sanitizeRulesConfig(value) : null;
}

/** Displayable representative set for a list of reps (S = whole group). */
async function displayableRepSet(
  pool: PoolLike,
  repKeys: number[]
): Promise<Set<number>> {
  if (!repKeys.length) {
    return new Set();
  }
  const params = new SqlParams();
  const rows = await queryDisplayableCandidates(pool, {
    params,
    sourcePredicate: await buildRepMembershipPredicate(pool, params, repKeys),
    excludedRepKeys: [],
    limit: repKeys.length
  });
  return new Set(rows.map((row) => Number(row.rep_key)));
}

export default {
  Product: {
    relatedProductsMode: async (
      product: { productId: number; relatedProductsMode?: string },
      _args: unknown,
      { pool }: { pool: PoolLike }
    ) =>
      product.relatedProductsMode ??
      (await requireAnchor(product, pool)).related_products_mode,
    relatedProductsRules: async (
      product: { productId: number },
      _args: unknown,
      { pool }: { pool: PoolLike }
    ) =>
      toRulesConfig(
        (await requireAnchor(product, pool)).related_products_rules
      ),
    effectiveRelatedProductsRules: async (
      product: { productId: number },
      _args: unknown,
      { pool }: { pool: PoolLike }
    ) => resolveEffectiveRelatedRules(await requireAnchor(product, pool)).config,
    crossSellMode: async (
      product: { productId: number; crossSellMode?: string },
      _args: unknown,
      { pool }: { pool: PoolLike }
    ) =>
      product.crossSellMode ??
      (await requireAnchor(product, pool)).cross_sell_mode,
    excludeFromRecommendation: async (
      product: { productId: number; excludeFromRecommendation?: boolean },
      _args: unknown,
      { pool }: { pool: PoolLike }
    ) =>
      product.excludeFromRecommendation ??
      Boolean(
        (
          await pool.query(
            'SELECT exclude_from_recommendation FROM product WHERE product_id = $1',
            [product.productId]
          )
        ).rows[0]?.exclude_from_recommendation
      ),
    crossSellCandidates: async (
      product: { productId: number },
      _args: unknown,
      { pool }: { pool: PoolLike }
    ) => {
      const anchor = await requireAnchor(product, pool);
      const gates = readCrossSellGates();
      // UNGATED on purpose — the comparison table shows candidates the
      // storefront rejects, with the numbers explaining why.
      const result = await pool.query(
        `SELECT r.related_product_id,
                r.co_purchase_count,
                sa.order_count AS anchor_orders,
                (r.co_purchase_count::float / NULLIF(sa.order_count, 0)) AS confidence,
                (r.co_purchase_count::float * m.total_order_count)
                  / NULLIF(sa.order_count::bigint * sb.order_count, 0) AS lift
         FROM product_relation r
         LEFT JOIN product_stat sa ON sa.product_id = r.product_id
         LEFT JOIN product_stat sb ON sb.product_id = r.related_product_id
         CROSS JOIN product_stat_meta m
         WHERE r.product_id = $1
         ORDER BY lift DESC NULLS LAST, r.co_purchase_count DESC
         LIMIT 50`,
        [anchor.rep_key]
      );
      const reps = result.rows.map(
        (row: { related_product_id: number }) => row.related_product_id
      );
      const [displayable, products] = await Promise.all([
        displayableRepSet(pool, reps),
        loadBareProducts(pool, reps)
      ]);
      return result.rows.map(
        (row: {
          related_product_id: number;
          co_purchase_count: number;
          anchor_orders: number | null;
          confidence: number | null;
          lift: number | null;
        }) => ({
          product: products.get(row.related_product_id) || null,
          coPurchaseCount: row.co_purchase_count,
          confidence: row.confidence || 0,
          lift: row.lift || 0,
          passesGates:
            row.co_purchase_count >= gates.minPairCount &&
            (row.anchor_orders || 0) >= gates.minAnchorOrders &&
            (row.lift || 0) > gates.minLift,
          hiddenByCatalogFilter: !displayable.has(row.related_product_id)
        })
      );
    },
    relatedProductsResolved: async (
      product: { productId: number },
      { limit }: { limit?: number },
      { pool }: { pool: PoolLike }
    ) => {
      const clamped = Math.min(25, Math.max(1, parseInt(String(limit), 10) || 5));
      const rows = await resolveRelatedProducts(product.productId, clamped, pool);
      return rows.map((row) => ({
        product: camelCase(row),
        source: row.source || 'unknown',
        salesCount: row.sales_rank || 0
      }));
    },
    crossSellResolved: async (
      product: { productId: number },
      { limit }: { limit?: number },
      { pool }: { pool: PoolLike }
    ) => {
      const clamped = Math.min(25, Math.max(1, parseInt(String(limit), 10) || 4));
      const rows = await resolveCrossSellProducts(product.productId, clamped, pool);
      return rows.map((row) => ({
        product: camelCase(row),
        source: row.source || 'unknown',
        salesCount: row.sales_rank || 0
      }));
    },
    productLinks: async (
      product: { productId: number },
      { type }: { type: string },
      { pool }: { pool: PoolLike }
    ) => {
      const anchor = await requireAnchor(product, pool);
      const links = await pool.query(
        `SELECT pl.uuid AS link_uuid, pl.sort_order, pl.linked_product_id,
                COALESCE(
                  (SELECT MIN(p2.product_id) FROM product p2
                   WHERE p2.variant_group_id = target.variant_group_id),
                  target.product_id
                ) AS target_rep
         FROM product_link pl
         INNER JOIN product target ON target.product_id = pl.linked_product_id
         WHERE pl.product_id = $1 AND pl.type = $2
         ORDER BY pl.sort_order, pl.product_link_id`,
        [anchor.product_id, type]
      );
      const reps = links.rows.map(
        (row: { target_rep: number }) => row.target_rep
      );
      const [displayable, products] = await Promise.all([
        displayableRepSet(pool, reps),
        loadBareProducts(
          pool,
          links.rows.map(
            (row: { linked_product_id: number }) => row.linked_product_id
          )
        )
      ]);
      return links.rows.map(
        (row: {
          link_uuid: string;
          sort_order: number;
          linked_product_id: number;
          target_rep: number;
        }) => {
          const isAnchorGroup = Number(row.target_rep) === anchor.rep_key;
          const isHidden =
            isAnchorGroup || !displayable.has(Number(row.target_rep));
          return {
            linkUuid: row.link_uuid,
            product: products.get(row.linked_product_id) || null,
            sortOrder: row.sort_order,
            hiddenOnStorefront: isHidden,
            hiddenReason: isHidden
              ? isAnchorGroup
                ? 'anchor_group'
                : 'catalog_filter'
              : null
          };
        }
      );
    },
    recommendationStatus: async (
      product: { productId: number },
      _args: unknown,
      { pool }: { pool: PoolLike }
    ) => {
      const anchor = await requireAnchor(product, pool);
      const { source } = resolveEffectiveRelatedRules(anchor);
      const [stat, meta] = await Promise.all([
        pool.query('SELECT order_count FROM product_stat WHERE product_id = $1', [
          anchor.rep_key
        ]),
        pool.query(
          'SELECT total_order_count, computed_at FROM product_stat_meta WHERE id = 1'
        )
      ]);
      let sourceCategory: Record<string, unknown> | null = null;
      if (source === 'category' && anchor.category_id) {
        const category = await pool.query(
          `SELECT category.*, cd.name, cd.url_key
           FROM category
           LEFT JOIN category_description cd
             ON cd.category_description_category_id = category.category_id
           WHERE category.category_id = $1`,
          [anchor.category_id]
        );
        sourceCategory = category.rows[0] ? camelCase(category.rows[0]) : null;
      }
      return {
        anchorOrderCount: stat.rows[0]?.order_count || 0,
        computedAt: meta.rows[0]?.computed_at
          ? new Date(meta.rows[0].computed_at).toISOString()
          : null,
        totalOrderCount: meta.rows[0]?.total_order_count || 0,
        relatedRulesSource: source,
        sourceCategory
      };
    }
  },
  Category: {
    relatedProductsRules: async (
      category: { categoryId: number; relatedProductsRules?: unknown },
      _args: unknown,
      { pool }: { pool: PoolLike }
    ) => {
      if (category.relatedProductsRules !== undefined) {
        return toRulesConfig(category.relatedProductsRules);
      }
      const result = await pool.query(
        'SELECT related_products_rules FROM category WHERE category_id = $1',
        [category.categoryId]
      );
      return toRulesConfig(result.rows[0]?.related_products_rules);
    }
  },
  Setting: {
    relatedProductsRules: () => getGlobalRelatedProductsRules(),
    crossSellMinPairCount: () => getCrossSellMinPairCount(),
    crossSellMinAnchorOrders: () => getCrossSellMinAnchorOrders(),
    crossSellMinLift: () => getCrossSellMinLift(),
    crossSellFallbackEnabled: () => getCrossSellFallbackEnabled()
  },
  Query: {
    recommendationStatSummary: async (
      _root: unknown,
      _args: unknown,
      { pool }: { pool: PoolLike }
    ) => {
      const [meta, pairs] = await Promise.all([
        pool.query(
          'SELECT total_order_count, computed_at FROM product_stat_meta WHERE id = 1'
        ),
        pool.query('SELECT COUNT(*) AS n FROM product_relation')
      ]);
      return {
        computedAt: meta.rows[0]?.computed_at
          ? new Date(meta.rows[0].computed_at).toISOString()
          : null,
        totalOrderCount: meta.rows[0]?.total_order_count || 0,
        pairCount: parseInt(pairs.rows[0]?.n || '0', 10)
      };
    }
  }
};

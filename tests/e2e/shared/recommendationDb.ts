import { randomUUID } from 'node:crypto';
import { getDb } from './db.js';

/**
 * Fixture world for the recommendation specs (related products + FBT).
 *
 * Convention (mirrors productDb.ts): every row carries an `E2E-RECO` /
 * `e2e-reco` marker in sku/name/code so `cleanupRecoWorld()` can sweep an
 * interrupted run idempotently. Stats rows need no marker — they cascade
 * from the products, and the "Recompute now" spec legitimately rebuilds
 * them from real order history anyway (derived data).
 *
 * WORKERS=1 ASSUMPTION: the sweep is GLOBAL over the marker, and three spec
 * files (shelves, cartShelf, admin card) each build their own world with it
 * — under parallel workers one file's beforeAll/afterAll would delete a
 * sibling's live world mid-test. If PLAYWRIGHT_WORKERS ever goes above 1,
 * scope the sweep by tag and move the orphan sweep to globalTeardown.
 */

export interface ProductFixture {
  productId: number;
  uuid: string;
  sku: string;
  name: string;
}

export interface RecoWorld {
  tag: string;
  categoryId: number;
  /**
   * Custom related rules (same_category, NO bestseller fallback) so the
   * related shelf is deterministic regardless of the store's live global
   * settings. cross_sell_mode stays auto (co-purchase pair seeded).
   */
  anchor: ProductFixture;
  /** Same category, sales rank 5 — appears mid-shelf. */
  pGood: ProductFixture;
  /** Same category, sales rank 9 — must appear FIRST in rule results. */
  pBest: ProductFixture;
  /** Gated out: disabled / out of stock / excluded-from-recommendations. */
  pDisabled: ProductFixture;
  pOos: ProductFixture;
  pExcluded: ProductFixture;
  /** No category — reachable only as a manual pick / FBT candidate. */
  pOther: ProductFixture;
  /**
   * related manual_only with ONE pick (pOther); FBT manual_only, no picks.
   * manual_only also opts the product out of the DERIVED upsell shelf.
   */
  manualAnchor: ProductFixture;
  /** Both modes manual_only with no picks — both shelves render nothing. */
  emptyAnchor: ProductFixture;
  relatedHeading: string;
  fbtHeading: string;
  upsellHeading: string;
  cartFbtHeading: string;
}

async function insertProduct(params: {
  tag: string;
  suffix: string;
  categoryId: number | null;
  price?: number;
  status?: boolean;
  inStock?: boolean;
  exclude?: boolean;
  groupId: number;
  taxClass: number | null;
}): Promise<{ productId: number; uuid: string; sku: string; name: string }> {
  const db = getDb();
  const sku = `E2E-RECO-${params.suffix}-${params.tag}`;
  const name = `E2E Reco ${params.suffix} ${params.tag}`;
  const { rows } = await db.query<{ product_id: number; uuid: string }>(
    `INSERT INTO product
       (sku, price, status, visibility, group_id, weight, no_shipping_required,
        tax_class, category_id, exclude_from_recommendation, meta_data)
     VALUES ($1::varchar, $2, $3::boolean, TRUE, $4::int, 0, TRUE,
             $5::smallint, $6::int, $7::boolean, '{}'::jsonb)
     RETURNING product_id, uuid`,
    [
      sku,
      params.price ?? 20,
      params.status ?? true,
      params.groupId,
      params.taxClass,
      params.categoryId,
      params.exclude ?? false
    ]
  );
  const { product_id: productId, uuid } = rows[0];
  // description '[]' (row-editor format): keeps the grid tsvector non-null
  // and the PDP description renderer happy — same shape as productDb.ts.
  await db.query(
    `INSERT INTO product_description
       (product_description_product_id, name, description, url_key, meta_title)
     VALUES ($1::int, $2::varchar, '[]', $3::varchar, $2::varchar)`,
    [productId, name, sku.toLowerCase()]
  );
  const inStock = params.inStock ?? true;
  await db.query(
    `INSERT INTO product_inventory
       (product_inventory_product_id, manage_stock, qty, stock_availability)
     SELECT $1, $2, $3, $4
     WHERE NOT EXISTS (
       SELECT 1 FROM product_inventory WHERE product_inventory_product_id = $1
     )`,
    [productId, !inStock, inStock ? 100 : 0, inStock]
  );
  if (!inStock) {
    // Core may auto-create an inventory row; force the out-of-stock shape.
    await db.query(
      `UPDATE product_inventory
       SET manage_stock = TRUE, qty = 0, stock_availability = FALSE
       WHERE product_inventory_product_id = $1`,
      [productId]
    );
  }
  return { productId, uuid, sku, name };
}

export async function createRecoWorld(): Promise<RecoWorld> {
  const db = getDb();
  const tag = `e2ereco${randomUUID().replace(/-/g, '').slice(0, 8)}`;

  const { rows: groups } = await db.query<{ attribute_group_id: number }>(
    `SELECT attribute_group_id FROM attribute_group ORDER BY attribute_group_id LIMIT 1`
  );
  if (groups.length === 0) {
    throw new Error('No attribute_group found — cannot create test products.');
  }
  const groupId = groups[0].attribute_group_id;
  const { rows: taxes } = await db.query<{ tax_class_id: number }>(
    `SELECT tax_class_id FROM tax_class ORDER BY tax_class_id LIMIT 1`
  );
  const taxClass = taxes[0]?.tax_class_id ?? null;

  const { rows: catRows } = await db.query<{ category_id: number }>(
    `INSERT INTO category (status) VALUES (TRUE) RETURNING category_id`
  );
  const categoryId = catRows[0].category_id;
  await db.query(
    `INSERT INTO category_description
       (category_description_category_id, name, url_key)
     VALUES ($1, $2, $3)`,
    [categoryId, `E2E Reco Category ${tag}`, `e2e-reco-cat-${tag}`]
  );

  const base = { tag, groupId, taxClass, categoryId };
  const anchor = await insertProduct({ ...base, suffix: 'ANCHOR' });
  // Pricier than the anchor (20): they double as the upsell shelf's world —
  // the derived resolver keeps only price-above rule matches.
  const pGood = await insertProduct({ ...base, suffix: 'GOOD', price: 25 });
  const pBest = await insertProduct({ ...base, suffix: 'BEST', price: 30 });
  const pDisabled = await insertProduct({ ...base, suffix: 'DISABLED', status: false });
  const pOos = await insertProduct({ ...base, suffix: 'OOS', inStock: false });
  const pExcluded = await insertProduct({ ...base, suffix: 'EXCLUDED', exclude: true });
  const pOther = await insertProduct({ ...base, suffix: 'OTHER', categoryId: null });
  const manualAnchor = await insertProduct({ ...base, suffix: 'MANUAL' });
  const emptyAnchor = await insertProduct({ ...base, suffix: 'EMPTY' });

  // Deterministic related rules for the main anchor: same_category only,
  // fallback OFF — the shelf must be exactly {pBest, pGood} whatever the
  // store's global settings currently say.
  await db.query(
    `UPDATE product
     SET related_products_mode = 'custom',
         related_products_rules = $2::jsonb
     WHERE product_id = $1`,
    [
      anchor.productId,
      JSON.stringify({
        enabled: true,
        rules: [{ type: 'same_category', enabled: true }],
        priceBand: { enabled: false, percent: 30 },
        fallbackToBestsellers: false
      })
    ]
  );
  await db.query(
    `UPDATE product
     SET related_products_mode = 'manual_only', cross_sell_mode = 'manual_only'
     WHERE product_id = ANY($1::int[])`,
    [[manualAnchor.productId, emptyAnchor.productId]]
  );
  await db.query(
    `INSERT INTO product_link (product_id, linked_product_id, type, sort_order)
     VALUES ($1, $2, 'related', 0)
     ON CONFLICT (product_id, linked_product_id, type) DO NOTHING`,
    [manualAnchor.productId, pOther.productId]
  );

  // Stats: sales ranks for rule ordering; one strong co-purchase pair
  // (anchor ↔ pOther, lift >> 1) that passes the default gates (3/5/1).
  await db.query(
    `INSERT INTO product_stat (product_id, order_count) VALUES
       ($1, 10), ($2, 5), ($3, 9), ($4, 20)
     ON CONFLICT (product_id) DO UPDATE SET order_count = EXCLUDED.order_count`,
    [anchor.productId, pGood.productId, pBest.productId, pOther.productId]
  );
  await db.query(
    `INSERT INTO product_relation (product_id, related_product_id, co_purchase_count)
     VALUES ($1, $2, 6), ($2, $1, 6)
     ON CONFLICT (product_id, related_product_id)
       DO UPDATE SET co_purchase_count = EXCLUDED.co_purchase_count`,
    [anchor.productId, pOther.productId]
  );
  await db.query(
    `INSERT INTO product_stat_meta (id, total_order_count, computed_at)
     VALUES (1, 100, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE
       SET total_order_count = GREATEST(product_stat_meta.total_order_count, 100),
           computed_at = CURRENT_TIMESTAMP`
  );

  // Route-level published placements: three PDP shelves on productView
  // (area productPageBottom) + the cart shelf on the cart route's always-
  // rendered `content` area (the shoppingCart* areas vanish on empty carts,
  // which would blind the empty-cart spec).
  const relatedHeading = `E2E Related ${tag}`;
  const fbtHeading = `E2E Together ${tag}`;
  const upsellHeading = `E2E Upsell ${tag}`;
  const cartFbtHeading = `E2E CartTogether ${tag}`;
  for (const [type, heading, route, area, sort] of [
    ['related_products', relatedHeading, 'productView', 'productPageBottom', 1],
    ['frequently_bought_together', fbtHeading, 'productView', 'productPageBottom', 2],
    ['upsell_products', upsellHeading, 'productView', 'productPageBottom', 3],
    ['cart_frequently_bought_together', cartFbtHeading, 'cart', 'content', 20]
  ] as Array<[string, string, string, string, number]>) {
    const { rows: widgetRows } = await db.query<{ widget_instance_id: number }>(
      `INSERT INTO widget_instance (name, type, settings, status)
       VALUES ($1, $2, $3, TRUE)
       RETURNING widget_instance_id`,
      [`e2e-reco-${type}-${tag}`, type, JSON.stringify({ heading, limit: 4 })]
    );
    await db.query(
      `INSERT INTO widget_placement (widget_instance_id, route, area, sort_order)
       VALUES ($1, $2, $3, $4)`,
      [widgetRows[0].widget_instance_id, route, area, sort]
    );
  }

  return {
    tag,
    categoryId,
    anchor,
    pGood,
    pBest,
    pDisabled,
    pOos,
    pExcluded,
    pOther,
    manualAnchor,
    emptyAnchor,
    relatedHeading,
    fbtHeading,
    upsellHeading,
    cartFbtHeading
  };
}

/** Idempotent sweep — safe on interrupted runs; called before AND after. */
export async function cleanupRecoWorld(): Promise<void> {
  const db = getDb();
  await db.query(
    `DELETE FROM widget_placement
     WHERE widget_instance_id IN (
       SELECT widget_instance_id FROM widget_instance WHERE name LIKE 'e2e-reco-%'
     )`
  );
  await db.query(`DELETE FROM widget_instance WHERE name LIKE 'e2e-reco-%'`);
  // description/inventory/link/stat/relation rows cascade from product.
  await db.query(`DELETE FROM product WHERE sku LIKE 'E2E-RECO-%'`);
  // Products first (they reference category_id), then the categories —
  // matched via their descriptions' url_key marker (description cascades).
  await db.query(
    `DELETE FROM category
     WHERE category_id IN (
       SELECT category_description_category_id FROM category_description
       WHERE url_key LIKE 'e2e-reco-cat-%'
     )`
  );
}

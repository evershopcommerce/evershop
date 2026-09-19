import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Pool } from 'pg';
import migrate from '../../migration/Version-1.0.14.js';
import { resolveCartCrossSellProducts } from '../../services/recommendation/resolveCartCrossSellProducts.js';
import { resolveCrossSellProducts } from '../../services/recommendation/resolveCrossSellProducts.js';
import { resolveRelatedProducts } from '../../services/recommendation/resolveRelatedProducts.js';
import { resolveUpsellProducts } from '../../services/recommendation/resolveUpsellProducts.js';

/**
 * DB-backed verification of the resolution services (spec § 6.3, § 6.6,
 * § 7.4–7.6, § 15) on a scratch database: stub catalog tables + the REAL
 * Version-1.0.14 migration. Settings are cold in this process, so the global
 * config is the § 12 zero-config default (same_category rule + bestseller
 * fallback) and the FBT gates are pair ≥ 3, anchor ≥ 5, lift > 1 — fixtures
 * are calibrated against exactly those.
 *
 * Self-skipping like recomputeStats.test.ts: the probe proves PG13+ and
 * CREATEDB by creating the scratch DB itself.
 */

jest.setTimeout(30000);

const SCRATCH_DB = 'evershop_reco_resolve_test';

function poolConfig(database: string) {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || undefined,
    password: process.env.DB_PASSWORD || undefined,
    database
  };
}

async function probeServer(): Promise<boolean> {
  const probe = new Pool({ ...poolConfig('postgres'), max: 1 });
  try {
    const version = await probe.query(
      `SELECT current_setting('server_version_num')::int AS v`
    );
    if (version.rows[0].v < 130000) {
      return false;
    }
    await probe.query(`DROP DATABASE IF EXISTS ${SCRATCH_DB} WITH (FORCE)`);
    await probe.query(`CREATE DATABASE ${SCRATCH_DB}`);
    return true;
  } catch {
    return false;
  } finally {
    await probe.end().catch(() => {});
  }
}

const serverAvailable = await probeServer();
const describeDb = serverAvailable ? describe : describe.skip;

describeDb('recommendation resolution services (scratch DB)', () => {
  let admin: Pool;
  let db: Pool;

  // Categories / collections / attribute ids
  let c1: number;
  let c2: number;
  let col1: number;
  let colorAttr: number;
  const RED = 11;
  const BLUE = 12;

  // Products
  let anchor: number; // ungrouped, C1, price 100, red
  let b1: number; // C1, red, price 90, sales 5
  let b2: number; // C1, blue, price 500, sales 9 (category bestseller)
  let b3: number; // C1, disabled
  let b4: number; // C1, out of stock
  let b5: number; // C1, exclude_from_recommendation
  let b6: number; // C2, shares COL1 with anchor
  let v1: number; // group G rep, C1, INVISIBLE, sales 7 (on rep)
  let v2: number; // group G, C1, visible → display member
  let h1: number; // group H, C1, invisible (group visibility on)
  let h2: number; // group H, C1, invisible, max id → carve-out member
  let k1: number; // group K, C1, red, invisible; sibling k2 visible in C2
  let k2: number;
  let l1: number; // group L, C1, invisible, group visibility OFF → never shown
  let xp: number; // FBT partner: strong lift
  let xq: number; // FBT partner: lift exactly 1.0 → gated out
  let xr: number; // FBT partner: pair count below gate

  interface ProductSpec {
    category?: number | null;
    price?: number;
    status?: boolean;
    visibility?: boolean;
    group?: number | null;
    exclude?: boolean;
    inStock?: boolean;
    sales?: number;
  }

  async function addProduct(spec: ProductSpec = {}): Promise<number> {
    const r = await db.query(
      `INSERT INTO product (sku, price, status, visibility, variant_group_id, category_id, exclude_from_recommendation)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6) RETURNING product_id`,
      [
        spec.price ?? 10,
        spec.status ?? true,
        spec.visibility ?? true,
        spec.group ?? null,
        spec.category ?? null,
        spec.exclude ?? false
      ]
    );
    const id = r.rows[0].product_id;
    await db.query(
      `INSERT INTO product_description (product_description_product_id, name, url_key)
       VALUES ($1, $2, $3)`,
      [id, `Product ${id}`, `product-${id}`]
    );
    const inStock = spec.inStock ?? true;
    await db.query(
      `INSERT INTO product_inventory (product_inventory_product_id, manage_stock, qty, stock_availability)
       VALUES ($1, $2, $3, $4)`,
      [id, !inStock, inStock ? 100 : 0, inStock]
    );
    if (spec.sales) {
      await db.query(
        'INSERT INTO product_stat (product_id, order_count) VALUES ($1, $2)',
        [id, spec.sales]
      );
    }
    return id;
  }

  async function link(
    from: number,
    to: number,
    type: string,
    sortOrder: number
  ) {
    await db.query(
      `INSERT INTO product_link (product_id, linked_product_id, type, sort_order)
       VALUES ($1, $2, $3, $4)`,
      [from, to, type, sortOrder]
    );
  }

  const ids = (rows: Array<{ product_id: number }>) =>
    rows.map((row) => row.product_id);

  beforeAll(async () => {
    admin = new Pool({ ...poolConfig('postgres'), max: 1 });
    db = new Pool({ ...poolConfig(SCRATCH_DB), max: 5 });

    await db.query(`
      CREATE TABLE variant_group (
        variant_group_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        visibility boolean NOT NULL DEFAULT TRUE
      );
      CREATE TABLE product (
        product_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        uuid UUID NOT NULL DEFAULT gen_random_uuid(),
        sku varchar,
        price decimal(12,4) NOT NULL DEFAULT 10,
        status boolean NOT NULL DEFAULT TRUE,
        visibility boolean NOT NULL DEFAULT TRUE,
        image varchar,
        variant_group_id INT,
        category_id INT
      );
      CREATE TABLE category (
        category_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
      );
      CREATE TABLE product_description (
        product_description_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        product_description_product_id INT NOT NULL,
        name varchar,
        url_key varchar
      );
      CREATE TABLE product_inventory (
        product_inventory_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        product_inventory_product_id INT NOT NULL,
        manage_stock boolean NOT NULL DEFAULT FALSE,
        qty INT NOT NULL DEFAULT 0,
        stock_availability boolean NOT NULL DEFAULT FALSE
      );
      CREATE TABLE collection (
        collection_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
      );
      CREATE TABLE product_collection (
        collection_id INT NOT NULL,
        product_id INT NOT NULL
      );
      CREATE TABLE attribute (
        attribute_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        attribute_code varchar,
        type varchar
      );
      CREATE TABLE product_attribute_value_index (
        product_id INT NOT NULL,
        attribute_id INT NOT NULL,
        option_id INT,
        option_text varchar
      );
      CREATE TABLE product_image (
        product_image_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        product_image_product_id INT NOT NULL,
        origin_image varchar,
        is_main boolean NOT NULL DEFAULT FALSE
      );
      CREATE TABLE "order" (
        order_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        status varchar NOT NULL DEFAULT 'new'
      );
      CREATE TABLE order_item (
        order_item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        order_item_order_id INT NOT NULL,
        product_id INT NOT NULL,
        qty INT NOT NULL DEFAULT 1
      );
    `);
    const migrationClient = await db.connect();
    try {
      await migrate(migrationClient);
    } finally {
      migrationClient.release();
    }

    c1 = (await db.query('INSERT INTO category DEFAULT VALUES RETURNING category_id')).rows[0].category_id;
    c2 = (await db.query('INSERT INTO category DEFAULT VALUES RETURNING category_id')).rows[0].category_id;
    col1 = (await db.query('INSERT INTO collection DEFAULT VALUES RETURNING collection_id')).rows[0].collection_id;
    colorAttr = (
      await db.query(
        `INSERT INTO attribute (attribute_code, type) VALUES ('color', 'select') RETURNING attribute_id`
      )
    ).rows[0].attribute_id;

    const groups: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      groups.push(
        (
          await db.query(
            'INSERT INTO variant_group (visibility) VALUES ($1) RETURNING variant_group_id',
            [i !== 3] // group L (index 3) has visibility OFF
          )
        ).rows[0].variant_group_id
      );
    }
    const [gG, gH, gJ, gL] = groups;

    anchor = await addProduct({ category: c1, price: 100 });
    b1 = await addProduct({ category: c1, price: 90, sales: 5 });
    b2 = await addProduct({ category: c1, price: 500, sales: 9 });
    b3 = await addProduct({ category: c1, status: false });
    b4 = await addProduct({ category: c1, inStock: false });
    b5 = await addProduct({ category: c1, exclude: true });
    b6 = await addProduct({ category: c2 });
    v1 = await addProduct({ category: c1, group: gG, visibility: false, sales: 7 });
    v2 = await addProduct({ category: c1, group: gG });
    h1 = await addProduct({ category: c1, group: gH, visibility: false });
    h2 = await addProduct({ category: c1, group: gH, visibility: false });
    k1 = await addProduct({ category: c1, group: gJ, visibility: false });
    k2 = await addProduct({ category: c2, group: gJ });
    l1 = await addProduct({ category: c1, group: gL, visibility: false });

    // Anchor + b1 + k1 are red; b2 is blue.
    for (const [pid, opt] of [
      [anchor, RED],
      [b1, RED],
      [k1, RED],
      [b2, BLUE]
    ] as Array<[number, number]>) {
      await db.query(
        `INSERT INTO product_attribute_value_index (product_id, attribute_id, option_id, option_text)
         VALUES ($1, $2, $3, $4)`,
        [pid, colorAttr, opt, opt === RED ? 'Red' : 'Blue']
      );
    }
    // Anchor and b6 share collection COL1.
    for (const pid of [anchor, b6]) {
      await db.query(
        'INSERT INTO product_collection (collection_id, product_id) VALUES ($1, $2)',
        [col1, pid]
      );
    }
    // Main image for b2 — asserts the origin_image pass-through.
    await db.query(
      `INSERT INTO product_image (product_image_product_id, origin_image, is_main)
       VALUES ($1, '/media/b2-main.png', TRUE)`,
      [b2]
    );
  });

  // Tests mutate modes/rules/links; reset here so ONE regression reports as
  // ONE failure instead of cascading stale state into later tests.
  afterEach(async () => {
    await db.query('DELETE FROM product_link');
    await db.query(
      `UPDATE product SET related_products_mode = 'inherit',
                          related_products_rules = NULL,
                          cross_sell_mode = 'auto'`
    );
    await db.query('UPDATE category SET related_products_rules = NULL');
  });

  afterAll(async () => {
    if (db) {
      await db.end().catch(() => {});
    }
    if (admin) {
      await admin
        .query(`DROP DATABASE IF EXISTS ${SCRATCH_DB} WITH (FORCE)`)
        .catch(() => {});
      await admin.end().catch(() => {});
    }
  });

  describe('related products — global default config (same_category + bestseller fallback)', () => {
    it('ranks by sales then id desc, dedups variant groups, and applies the § 6.6 policy', async () => {
      const rows = await resolveRelatedProducts(anchor, 3, db);
      // b2 sales 9, group G via rep v1 sales 7 displayed as visible member v2, b1 sales 5
      expect(ids(rows)).toEqual([b2, v2, b1]);
      // Field-resolver contract: image comes from product_image.origin_image
      // and inventory.isInStock computes from these parent-row columns.
      const b2Row = rows[0] as unknown as {
        origin_image: string;
        qty: number;
        manage_stock: boolean;
        stock_availability: boolean;
      };
      expect(b2Row.origin_image).toBe('/media/b2-main.png');
      expect(b2Row.qty).toBe(100);
      expect(b2Row.stock_availability).toBe(true);
    });

    it('a pinned invisible variant resolves to its displayable sibling (§ 7.6 for manual picks)', async () => {
      await link(anchor, v1, 'related', 1);
      const rows = await resolveRelatedProducts(anchor, 1, db);
      expect(ids(rows)).toEqual([v2]);
    });

    it('never surfaces gated products, shows the carve-out member of an all-invisible group, hides invisible-group-off products', async () => {
      const rows = await resolveRelatedProducts(anchor, 20, db);
      const got = ids(rows);
      expect(got).not.toContain(anchor);
      expect(got).not.toContain(b3); // disabled
      expect(got).not.toContain(b4); // out of stock
      expect(got).not.toContain(b5); // excluded flag
      expect(got).not.toContain(h1); // not the max-id carve-out member
      expect(got).toContain(h2); // § 6.6 case 2: all-invisible group, visibility on
      expect(got).not.toContain(l1); // group visibility off
      expect(got).not.toContain(v1); // invisible; sibling v2 displays instead
      expect(got).toContain(v2);
      expect(got).toContain(b6); // C2 product via the bestseller fallback rung
      expect(got).toContain(k1); // § 6.6 case 2 within S: k2 (visible) is outside C1
      expect(got).not.toContain(k2); // § 6.6 case 3: visible sibling doesn't match the rule
    });

    it('manual picks prepend in pin order and rules fill the remainder', async () => {
      await link(anchor, b1, 'related', 2);
      await link(anchor, b6, 'related', 1);
      const rows = await resolveRelatedProducts(anchor, 3, db);
      expect(ids(rows)).toEqual([b6, b1, b2]);
      await db.query('DELETE FROM product_link');
    });

    it('manual_only mode stops after the prefix', async () => {
      await link(anchor, b6, 'related', 1);
      await db.query(
        `UPDATE product SET related_products_mode = 'manual_only' WHERE product_id = $1`,
        [anchor]
      );
      const rows = await resolveRelatedProducts(anchor, 5, db);
      expect(ids(rows)).toEqual([b6]);
      await db.query(
        `UPDATE product SET related_products_mode = 'inherit' WHERE product_id = $1`,
        [anchor]
      );
      await db.query('DELETE FROM product_link');
    });
  });

  describe('related products — config tiers and rule variants', () => {
    const setCustom = async (rules: object | null) => {
      await db.query(
        `UPDATE product SET related_products_mode = $2, related_products_rules = $3
         WHERE product_id = $1`,
        [anchor, rules ? 'custom' : 'inherit', rules ? JSON.stringify(rules) : null]
      );
    };

    it('same_collection rule via EXISTS; fallback off ends the shelf short', async () => {
      await setCustom({
        enabled: true,
        rules: [{ type: 'same_collection', enabled: true }],
        fallbackToBestsellers: false
      });
      const rows = await resolveRelatedProducts(anchor, 5, db);
      expect(ids(rows)).toEqual([b6]);
      await setCustom(null);
    });

    it('same_attribute_values is scoped and matches per anchor value', async () => {
      await setCustom({
        enabled: true,
        rules: [
          {
            type: 'same_attribute_values',
            enabled: true,
            attributeCodes: ['color'],
            scope: 'same_category'
          }
        ],
        fallbackToBestsellers: false
      });
      const rows = await resolveRelatedProducts(anchor, 5, db);
      // Red in C1: b1 (sales 5) and k1 (carve-out member, sales 0). b2 is blue.
      expect(ids(rows)).toEqual([b1, k1]);
      await setCustom(null);
    });

    it('price band filters rule candidates', async () => {
      await setCustom({
        enabled: true,
        rules: [{ type: 'same_category', enabled: true }],
        priceBand: { enabled: true, percent: 30 },
        fallbackToBestsellers: false
      });
      const rows = await resolveRelatedProducts(anchor, 10, db);
      const got = ids(rows);
      expect(got).toContain(b1); // 90 within 70..130
      expect(got).not.toContain(b2); // 500 outside the band
      await setCustom(null);
    });

    it('category tier beats global; product custom beats category; enabled:false keeps manual only', async () => {
      await db.query(
        `UPDATE category SET related_products_rules = $2 WHERE category_id = $1`,
        [
          c1,
          JSON.stringify({
            enabled: true,
            rules: [{ type: 'same_collection', enabled: true }],
            fallbackToBestsellers: false
          })
        ]
      );
      expect(ids(await resolveRelatedProducts(anchor, 5, db))).toEqual([b6]);

      await setCustom({
        enabled: true,
        rules: [{ type: 'same_category', enabled: true }],
        fallbackToBestsellers: false
      });
      const custom = ids(await resolveRelatedProducts(anchor, 3, db));
      expect(custom).toEqual([b2, v2, b1]);
      await setCustom(null);

      await db.query(
        `UPDATE category SET related_products_rules = $2 WHERE category_id = $1`,
        [c1, JSON.stringify({ enabled: false, rules: [] })]
      );
      await link(anchor, b6, 'related', 1);
      expect(ids(await resolveRelatedProducts(anchor, 5, db))).toEqual([b6]);
      await db.query('DELETE FROM product_link');
      await db.query(
        'UPDATE category SET related_products_rules = NULL WHERE category_id = $1',
        [c1]
      );
    });
  });

  describe('cross-sell (FBT)', () => {
    beforeAll(async () => {
      xp = await addProduct({ category: c2 });
      xq = await addProduct({ category: c2 });
      xr = await addProduct({ category: c2 });
      // Anchor: 10 eligible orders; store total 100.
      await db.query(
        `INSERT INTO product_stat (product_id, order_count) VALUES ($1, 10)
         ON CONFLICT (product_id) DO UPDATE SET order_count = 10`,
        [anchor]
      );
      await db.query('UPDATE product_stat_meta SET total_order_count = 100');
      const pairs: Array<[number, number, number]> = [
        // [partner, partnerOrders, coCount]
        [xp, 20, 6], // lift 6*100/(10*20) = 3    → in
        [xq, 50, 5], // lift 5*100/(10*50) = 1.0  → NOT > 1 → out
        [xr, 5, 2], //  pair 2 < 3               → out
        [v1, 7, 4] //  lift 4*100/(10*7) ≈ 5.7   → in, displays sibling v2
      ];
      for (const [partner, orders, co] of pairs) {
        await db.query(
          `INSERT INTO product_stat (product_id, order_count) VALUES ($1, $2)
           ON CONFLICT (product_id) DO UPDATE SET order_count = $2`,
          [partner, orders]
        );
        await db.query(
          `INSERT INTO product_relation (product_id, related_product_id, co_purchase_count)
           VALUES ($1, $2, $3), ($2, $1, $3)`,
          [anchor, partner, co]
        );
      }
    });

    it('gates on pair count, anchor orders, and lift; ranks by lift; resolves display members', async () => {
      const rows = await resolveCrossSellProducts(anchor, 5, db, {
        minPairCount: 3,
        minAnchorOrders: 5,
        minLift: 1,
        fallbackEnabled: false
      });
      // v1's group (lift ≈5.7, displayed as v2) then xp (lift 3); xq and xr gated out.
      expect(ids(rows)).toEqual([v2, xp]);
    });

    it('returns nothing below the anchor-order gate with fallback off, and ladders with fallback on', async () => {
      const strict = await resolveCrossSellProducts(anchor, 5, db, {
        minPairCount: 3,
        minAnchorOrders: 50,
        minLift: 1,
        fallbackEnabled: false
      });
      expect(strict).toEqual([]);

      const laddered = await resolveCrossSellProducts(anchor, 3, db, {
        minPairCount: 3,
        minAnchorOrders: 50,
        minLift: 1,
        fallbackEnabled: true
      });
      // Same-category bestsellers first: b2 (9), group G via v2 (7), b1 (5).
      expect(ids(laddered)).toEqual([b2, v2, b1]);
    });

    it('honors the three modes and keeps manual picks per variant', async () => {
      await link(anchor, b2, 'cross_sell', 1);
      const auto = await resolveCrossSellProducts(anchor, 5, db, {
        minPairCount: 3,
        minAnchorOrders: 5,
        minLift: 1,
        fallbackEnabled: false
      });
      expect(ids(auto)).toEqual([v2, xp]); // auto ignores manual picks

      await db.query(
        `UPDATE product SET cross_sell_mode = 'manual_only' WHERE product_id = $1`,
        [anchor]
      );
      expect(
        ids(
          await resolveCrossSellProducts(anchor, 5, db, {
            minPairCount: 3,
            minAnchorOrders: 5,
            minLift: 1,
            fallbackEnabled: true
          })
        )
      ).toEqual([b2]);

      await db.query(
        `UPDATE product SET cross_sell_mode = 'manual_first' WHERE product_id = $1`,
        [anchor]
      );
      expect(
        ids(
          await resolveCrossSellProducts(anchor, 5, db, {
            minPairCount: 3,
            minAnchorOrders: 5,
            minLift: 1,
            fallbackEnabled: false
          })
        )
      ).toEqual([b2, v2, xp]);

      await db.query(
        `UPDATE product SET cross_sell_mode = 'auto' WHERE product_id = $1`,
        [anchor]
      );
      await db.query('DELETE FROM product_link');
    });
  });

  describe('upsell (derived shelf: related rules + price above, V2 wave 1)', () => {
    // Pricier same-category members; the anchor sits at price 100.
    let pU1: number;
    let pU2: number;

    beforeAll(async () => {
      pU1 = await addProduct({ category: c1, price: 120, sales: 8 });
      pU2 = await addProduct({ category: c1, price: 200, sales: 3 });
    });

    afterAll(async () => {
      await db.query('DELETE FROM product WHERE product_id = ANY($1)', [
        [pU1, pU2]
      ]);
    });

    it('re-runs the effective rules pricier-only, sales-ranked — no manual tier, no fallback', async () => {
      const rows = await resolveUpsellProducts(anchor, 5, db);
      // Pricier same-category members by sales: b2 (500, 9 orders),
      // pU1 (120, 8), pU2 (200, 3). Cheaper b1 (90) is out. Returning THREE
      // rows against limit 5 pins the absence of the fallback rung — the
      // related shelf would have filled the remaining slots.
      expect(ids(rows)).toEqual([b2, pU1, pU2]);
      expect(rows.map((row) => row.source)).toEqual([
        'same_category',
        'same_category',
        'same_category'
      ]);
      expect(ids(rows)).not.toContain(b1);
      // limit truncates the sales-ranked list
      expect(ids(await resolveUpsellProducts(anchor, 2, db))).toEqual([b2, pU1]);
    });

    it('an enabled price band becomes the UPPER cap (anchor < price \u2264 anchor\u00b7(1+P%))', async () => {
      await db.query(
        `UPDATE product SET related_products_mode = 'custom', related_products_rules = $2
         WHERE product_id = $1`,
        [
          anchor,
          JSON.stringify({
            enabled: true,
            rules: [{ type: 'same_category', enabled: true }],
            priceBand: { enabled: true, percent: 30 },
            fallbackToBestsellers: true
          })
        ]
      );
      // cap 130: pU1 (120) stays, pU2 (200) drops
      expect(ids(await resolveUpsellProducts(anchor, 5, db))).toEqual([pU1]);
      await db.query(
        `UPDATE product SET related_products_mode = 'inherit', related_products_rules = NULL
         WHERE product_id = $1`,
        [anchor]
      );
    });

    it('manual_only products opt out entirely; a disabled config yields nothing', async () => {
      await db.query(
        `UPDATE product SET related_products_mode = 'manual_only' WHERE product_id = $1`,
        [anchor]
      );
      expect(await resolveUpsellProducts(anchor, 5, db)).toEqual([]);
      await db.query(
        `UPDATE product SET related_products_mode = 'custom', related_products_rules = $2
         WHERE product_id = $1`,
        [anchor, JSON.stringify({ enabled: false, rules: [] })]
      );
      expect(await resolveUpsellProducts(anchor, 5, db)).toEqual([]);
      await db.query(
        `UPDATE product SET related_products_mode = 'inherit', related_products_rules = NULL
         WHERE product_id = $1`,
        [anchor]
      );
    });
  });

  // Declaration-order dependency (jest runs sibling describes in order):
  // this block consumes the FBT describe's seeds (anchor stats, meta=100,
  // xp/xq pairs) and must run AFTER the upsell describe's afterAll removed
  // pU1/pU2 — do not reorder the describes.
  describe('cart cross-sell (multi-anchor FBT, V2 wave 1)', () => {
    const GATES = {
      minPairCount: 3,
      minAnchorOrders: 5,
      minLift: 1,
      fallbackEnabled: false
    };
    // The fixture is deliberately NON-collinear so every D-W1-2 ranking key
    // is pinned independently (mutation-tested during review):
    //   MAX vs AVG   → z (single pair 2.8) must lose to xp (MAX 3.0, AVG 2.5)
    //   COUNT(*)     → y1 (2 anchors, SUM 10) before y2 (1 anchor, SUM 20,
    //                  SMALLER id) — only anchors-matched puts y1 first
    //   SUM(co)      → w2 (SUM 12, LARGER id) before w1/xq (SUM 6) — only
    //                  total-pairs puts w2 first
    //   id ASC       → xq before w1 (equal lift, COUNT, SUM)
    let y2: number;
    let y1: number;
    let z: number;
    let w1: number;
    let w2: number;

    beforeAll(async () => {
      // Second cart anchor: b6 (c2), 10 eligible orders, pairs with xp/xq.
      // xq is gated for THE ANCHOR (lift exactly 1.0) but passes for b6 —
      // per-pair gating must keep the passing row.
      await db.query(
        `INSERT INTO product_stat (product_id, order_count) VALUES ($1, 10)
         ON CONFLICT (product_id) DO UPDATE SET order_count = 10`,
        [b6]
      );
      const b6Pairs: Array<[number, number]> = [
        [xp, 4], // lift 4*100/(10*20) = 2.0 → in
        [xq, 6] // lift 6*100/(10*50) = 1.2 → in
      ];
      for (const [partner, co] of b6Pairs) {
        await db.query(
          `INSERT INTO product_relation (product_id, related_product_id, co_purchase_count)
           VALUES ($1, $2, $3), ($2, $1, $3)`,
          [b6, partner, co]
        );
      }
      // Creation order fixes the ids: y2 < y1 < z < w1 < w2.
      y2 = await addProduct({});
      y1 = await addProduct({});
      z = await addProduct({});
      w1 = await addProduct({});
      w2 = await addProduct({});
      for (const [pid, orders] of [
        [y2, 100],
        [y1, 25],
        [z, 25],
        [w1, 50],
        [w2, 100]
      ] as Array<[number, number]>) {
        await db.query(
          `INSERT INTO product_stat (product_id, order_count) VALUES ($1, $2)`,
          [pid, orders]
        );
      }
      for (const [a, b, co] of [
        [anchor, y2, 20], // lift 20*100/(10*100) = 2.0, SUM 20, 1 anchor
        [anchor, y1, 5], // lift 5*100/(10*25)  = 2.0 ┐ 2 anchors, SUM 10
        [b6, y1, 5], // lift 5*100/(10*25)  = 2.0 ┘
        [anchor, z, 7], // lift 7*100/(10*25)  = 2.8, single pair
        [anchor, w1, 6], // lift 6*100/(10*50)  = 1.2, SUM 6
        [anchor, w2, 12] // lift 12*100/(10*100) = 1.2, SUM 12
      ] as Array<[number, number, number]>) {
        await db.query(
          `INSERT INTO product_relation (product_id, related_product_id, co_purchase_count)
           VALUES ($1, $2, $3), ($2, $1, $3)`,
          [a, b, co]
        );
      }
    });

    afterAll(async () => {
      await db.query('DELETE FROM product WHERE product_id = ANY($1)', [
        [y2, y1, z, w1, w2]
      ]);
    });

    it('aggregates per-pair-gated candidates across anchors, every ranking key load-bearing', async () => {
      const rows = await resolveCartCrossSellProducts(
        [anchor, b6],
        10,
        db,
        GATES
      );
      // v1 group (5.7, displays v2) > xp (MAX 3.0 — AVG would be 2.5 and
      // lose to z) > z (2.8) > y1 (2.0, 2 anchors) > y2 (2.0, 1 anchor,
      // SUM 20) > w2 (1.2, SUM 12) > xq (1.2, SUM 6, smaller id — its
      // anchor pair sits at lift exactly 1.0 and stays gated; the b6 pair
      // carries it) > w1 (1.2, SUM 6).
      expect(ids(rows)).toEqual([v2, xp, z, y1, y2, w2, xq, w1]);
      expect(rows.every((row) => row.source === 'co_purchase')).toBe(true);
    });

    it('excludes the whole variant group of a cart line — cart ids are variant-level', async () => {
      // v2 in the cart resolves to representative v1: the v-group candidate
      // (the top hit by lift) must disappear entirely. With b6 out of the
      // cart, y1 drops to ONE matched anchor (SUM 5) — y2 (SUM 20) now
      // outranks it, pinning SUM within equal MAX/COUNT once more.
      const rows = await resolveCartCrossSellProducts(
        [anchor, v2],
        5,
        db,
        GATES
      );
      expect(ids(rows)).toEqual([xp, z, y2, y1, w2]);
      expect(ids(rows)).not.toContain(v2);
    });

    it('skips missing lines and returns [] for empty or unknown carts', async () => {
      expect(await resolveCartCrossSellProducts([], 5, db, GATES)).toEqual([]);
      expect(
        await resolveCartCrossSellProducts([9999999], 5, db, GATES)
      ).toEqual([]);
      // A dead line degrades to the surviving lines, never aborts.
      const rows = await resolveCartCrossSellProducts(
        [anchor, 9999999],
        5,
        db,
        GATES
      );
      expect(ids(rows)).toEqual([v2, xp, z, y2, y1]);
    });

    it('fallback ladders cart categories first, then the store; a category-less cart goes straight to store bestsellers', async () => {
      const laddered = await resolveCartCrossSellProducts([anchor, b6], 3, db, {
        ...GATES,
        minAnchorOrders: 200, // gates out every pair
        fallbackEnabled: true
      });
      // Bestsellers across c1 ∪ c2: xq (50 orders, c2), xp (20, c2), b2 (9, c1).
      expect(ids(laddered)).toEqual([xq, xp, b2]);
      expect(
        laddered.every((row) => row.source === 'category_bestsellers')
      ).toBe(true);

      // y2 has no category: the category rung is skipped and the STORE rung
      // fills the shelf (cart rep itself excluded).
      const store = await resolveCartCrossSellProducts([y2], 2, db, {
        ...GATES,
        minAnchorOrders: 200,
        fallbackEnabled: true
      });
      // Store bestsellers by sales: w2 (100; y2's 100 is excluded as the
      // cart line), then the 50-orders tie xq/w1 resolves product_id DESC —
      // w1 has the larger id.
      expect(ids(store)).toEqual([w2, w1]);
      expect(store.every((row) => row.source === 'store_bestsellers')).toBe(
        true
      );
    });
  });
});

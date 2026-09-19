import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Pool } from 'pg';
import adminResolvers from '../../graphql/types/Product/Recommendation/RecommendationAdmin.admin.resolvers.js';
import migrate from '../../migration/Version-1.0.14.js';
import {
  createProductLink,
  ProductLinkError,
  removeProductLink,
  updateProductLink
} from '../../services/recommendation/productLink.js';

/**
 * Phase-5 verification (spec § 8.2, § 11, § 15) on a scratch DB: link-service
 * CRUD with every rejection path, and the admin diagnostics resolvers invoked
 * directly as functions. Settings are cold → § 12 default gates (3/5/1).
 */

jest.setTimeout(30000);

const SCRATCH_DB = 'evershop_reco_admin_test';

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

describeDb('link service + admin diagnostics (scratch DB)', () => {
  let admin: Pool;
  let db: Pool;

  let c1: number;
  let anchor: number; // grouped: rep of group A
  let sibA: number; // anchor's sibling (same group)
  let pA: number; // visible partner
  let pB: number; // disabled partner → catalog_filter
  let pC: number; // partner with lift exactly 1.0

  const uuids = new Map<number, string>();

  async function addProduct(spec: {
    category?: number | null;
    status?: boolean;
    group?: number | null;
  }): Promise<number> {
    const r = await db.query(
      `INSERT INTO product (sku, price, status, visibility, variant_group_id, category_id)
       VALUES (gen_random_uuid()::text, 10, $1, TRUE, $2, $3)
       RETURNING product_id, uuid`,
      [spec.status ?? true, spec.group ?? null, spec.category ?? null]
    );
    const { product_id: id, uuid } = r.rows[0];
    uuids.set(id, uuid);
    await db.query(
      `INSERT INTO product_description (product_description_product_id, name, url_key)
       VALUES ($1, $2, $3)`,
      [id, `Product ${id}`, `product-${id}`]
    );
    await db.query(
      `INSERT INTO product_inventory (product_inventory_product_id, manage_stock, qty, stock_availability)
       VALUES ($1, FALSE, 100, TRUE)`,
      [id]
    );
    return id;
  }

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
      CREATE TABLE category_description (
        category_description_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        category_description_category_id INT NOT NULL,
        name varchar,
        url_key varchar
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
      CREATE TABLE product_image (
        product_image_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        product_image_product_id INT NOT NULL,
        origin_image varchar,
        is_main boolean NOT NULL DEFAULT FALSE
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

    c1 = (
      await db.query('INSERT INTO category DEFAULT VALUES RETURNING category_id')
    ).rows[0].category_id;
    await db.query(
      `INSERT INTO category_description (category_description_category_id, name, url_key)
       VALUES ($1, 'Shoes', 'shoes')`,
      [c1]
    );
    const groupA = (
      await db.query(
        'INSERT INTO variant_group (visibility) VALUES (TRUE) RETURNING variant_group_id'
      )
    ).rows[0].variant_group_id;

    anchor = await addProduct({ category: c1, group: groupA });
    sibA = await addProduct({ category: c1, group: groupA });
    pA = await addProduct({ category: c1 });
    pB = await addProduct({ category: c1, status: false });
    pC = await addProduct({ category: null });

    // Stats: anchor rep = anchor (created first in group A); total 100 orders.
    await db.query('UPDATE product_stat_meta SET total_order_count = 100');
    const stats: Array<[number, number]> = [
      [anchor, 10],
      [pA, 20], // lift 6*100/(10*20) = 3   → passes
      [pB, 4], //  lift 4*100/(10*4)  = 10  → passes gates, hidden by filter
      [pC, 50] //  lift 5*100/(10*50) = 1.0 → fails the lift gate
    ];
    for (const [pid, orders] of stats) {
      await db.query(
        'INSERT INTO product_stat (product_id, order_count) VALUES ($1, $2)',
        [pid, orders]
      );
    }
    const pairs: Array<[number, number]> = [
      [pA, 6],
      [pB, 4],
      [pC, 5]
    ];
    for (const [pid, co] of pairs) {
      await db.query(
        `INSERT INTO product_relation (product_id, related_product_id, co_purchase_count)
         VALUES ($1, $2, $3), ($2, $1, $3)`,
        [anchor, pid, co]
      );
    }
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

  describe('product link service (§ 11)', () => {
    it('creates a link by uuids, rejects duplicates with 409', async () => {
      const link = await createProductLink(
        {
          productUuid: uuids.get(anchor)!,
          linkedProductUuid: uuids.get(pA)!,
          type: 'related',
          sortOrder: 5
        },
        db
      );
      expect(link.product_id).toBe(anchor);
      expect(link.linked_product_id).toBe(pA);
      expect(link.sort_order).toBe(5);

      await expect(
        createProductLink(
          {
            productUuid: uuids.get(anchor)!,
            linkedProductUuid: uuids.get(pA)!,
            type: 'related'
          },
          db
        )
      ).rejects.toMatchObject({ status: 409 });
      // Same pair, other type — allowed.
      const crossSell = await createProductLink(
        {
          productUuid: uuids.get(anchor)!,
          linkedProductUuid: uuids.get(pA)!,
          type: 'cross_sell'
        },
        db
      );
      expect(crossSell.type).toBe('cross_sell');
    });

    it('rejects self-links, same-variant-group links, upsell type, and unknown products with 400', async () => {
      await expect(
        createProductLink(
          {
            productUuid: uuids.get(anchor)!,
            linkedProductUuid: uuids.get(anchor)!,
            type: 'related'
          },
          db
        )
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        createProductLink(
          {
            productUuid: uuids.get(anchor)!,
            linkedProductUuid: uuids.get(sibA)!,
            type: 'related'
          },
          db
        )
      ).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining('variant')
      });
      // 'upsell' stays REJECTED: the upsell shelf is derived from the related
      // rules (V2 wave 1, D-W1-8 as amended) and takes no manual links; the
      // DB CHECK keeps the value for door-open reasons only.
      await expect(
        createProductLink(
          {
            productUuid: uuids.get(anchor)!,
            linkedProductUuid: uuids.get(pA)!,
            type: 'upsell' as never
          },
          db
        )
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        createProductLink(
          {
            productUuid: '00000000-0000-0000-0000-000000000000',
            linkedProductUuid: uuids.get(pA)!,
            type: 'related'
          },
          db
        )
      ).rejects.toMatchObject({ status: 400 });
      expect(new ProductLinkError(400, 'x')).toBeInstanceOf(Error);
    });

    it('updates sort order and deletes, scoped to the owning product', async () => {
      const link = await createProductLink(
        {
          productUuid: uuids.get(pA)!,
          linkedProductUuid: uuids.get(pC)!,
          type: 'related'
        },
        db
      );
      const updated = await updateProductLink(
        { productUuid: uuids.get(pA)!, linkUuid: link.uuid, sortOrder: 9 },
        db
      );
      expect(updated.sort_order).toBe(9);
      // Wrong owner → 404 (isolation).
      await expect(
        updateProductLink(
          { productUuid: uuids.get(anchor)!, linkUuid: link.uuid, sortOrder: 1 },
          db
        )
      ).rejects.toMatchObject({ status: 404 });
      const removed = await removeProductLink(
        { productUuid: uuids.get(pA)!, linkUuid: link.uuid },
        db
      );
      expect(removed.uuid).toBe(link.uuid);
      await expect(
        removeProductLink(
          { productUuid: uuids.get(pA)!, linkUuid: link.uuid },
          db
        )
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('admin diagnostics resolvers (§ 8.2)', () => {
    const ctx = () => ({ pool: db as never });

    it('crossSellCandidates: ungated list with gate flags and catalog-filter flags', async () => {
      const rows = await adminResolvers.Product.crossSellCandidates(
        { productId: anchor },
        {},
        ctx()
      );
      const byId = new Map(
        rows.map((row) => [
          (row.product as { productId: number } | null)?.productId,
          row
        ])
      );
      expect(byId.get(pA)).toMatchObject({
        coPurchaseCount: 6,
        passesGates: true,
        hiddenByCatalogFilter: false
      });
      expect(byId.get(pA)!.lift).toBeCloseTo(3);
      expect(byId.get(pA)!.confidence).toBeCloseTo(0.6);
      // Disabled product: passes the statistical gates, hidden by catalog filter.
      expect(byId.get(pB)).toMatchObject({
        passesGates: true,
        hiddenByCatalogFilter: true
      });
      // Lift exactly 1.0 fails the strict > gate but still listed for the admin.
      expect(byId.get(pC)).toMatchObject({ passesGates: false });
    });

    it('productLinks: pin order with anchor_group and catalog_filter reasons', async () => {
      // anchor→pA exists from the CRUD test (sort 5). Add a disabled pick and
      // simulate a later-group-join pick with a raw insert (the API rejects it).
      await createProductLink(
        {
          productUuid: uuids.get(anchor)!,
          linkedProductUuid: uuids.get(pB)!,
          type: 'related',
          sortOrder: 1
        },
        db
      );
      await db.query(
        `INSERT INTO product_link (product_id, linked_product_id, type, sort_order)
         VALUES ($1, $2, 'related', 0)`,
        [anchor, sibA]
      );
      const rows = await adminResolvers.Product.productLinks(
        { productId: anchor },
        { type: 'related' },
        ctx()
      );
      expect(
        rows.map((row) => (row.product as { productId: number } | null)?.productId)
      ).toEqual([sibA, pB, pA]);
      expect(rows[0]).toMatchObject({
        hiddenOnStorefront: true,
        hiddenReason: 'anchor_group'
      });
      expect(rows[1]).toMatchObject({
        hiddenOnStorefront: true,
        hiddenReason: 'catalog_filter'
      });
      expect(rows[2]).toMatchObject({
        hiddenOnStorefront: false,
        hiddenReason: null
      });
    });

    it('effective rules + source track the three config tiers', async () => {
      const status = () =>
        adminResolvers.Product.recommendationStatus(
          { productId: anchor },
          {},
          ctx()
        );
      expect((await status()).relatedRulesSource).toBe('global');

      await db.query(
        'UPDATE category SET related_products_rules = $2 WHERE category_id = $1',
        [c1, JSON.stringify({ enabled: true, rules: [] })]
      );
      const categoryStatus = await status();
      expect(categoryStatus.relatedRulesSource).toBe('category');
      expect(categoryStatus.sourceCategory).toMatchObject({ name: 'Shoes' });

      await db.query(
        `UPDATE product SET related_products_mode = 'custom', related_products_rules = $2
         WHERE product_id = $1`,
        [anchor, JSON.stringify({ enabled: true, rules: [] })]
      );
      expect((await status()).relatedRulesSource).toBe('product');
      const effective = await adminResolvers.Product.effectiveRelatedProductsRules(
        { productId: anchor },
        {},
        ctx()
      );
      expect(effective).toMatchObject({ enabled: true, rules: [] });

      await db.query(
        `UPDATE product SET related_products_mode = 'inherit', related_products_rules = NULL
         WHERE product_id = $1`,
        [anchor]
      );
      await db.query(
        'UPDATE category SET related_products_rules = NULL WHERE category_id = $1',
        [c1]
      );
    });

    it('recommendationStatSummary and Setting extensions serve defaults', async () => {
      const summary = await adminResolvers.Query.recommendationStatSummary(
        {},
        {},
        ctx()
      );
      expect(summary.totalOrderCount).toBe(100);
      expect(summary.pairCount).toBe(6); // 3 pairs × 2 directions
      expect(adminResolvers.Setting.crossSellMinPairCount()).toBe(3);
      expect(adminResolvers.Setting.crossSellMinAnchorOrders()).toBe(5);
      expect(adminResolvers.Setting.crossSellMinLift()).toBe(1);
      expect(adminResolvers.Setting.crossSellFallbackEnabled()).toBe(true);
      expect(adminResolvers.Setting.relatedProductsRules()).toMatchObject({
        enabled: true
      });
    });

    it('maps malformed uuids and out-of-range sort_order to 400s, never Postgres errors', async () => {
      await expect(
        createProductLink(
          { productUuid: 'not-a-uuid', linkedProductUuid: uuids.get(pA)!, type: 'related' },
          db
        )
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        createProductLink(
          { productUuid: uuids.get(pA)!, linkedProductUuid: '123', type: 'related' },
          db
        )
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        updateProductLink(
          { productUuid: uuids.get(pA)!, linkUuid: 'nope', sortOrder: 1 },
          db
        )
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        createProductLink(
          {
            productUuid: uuids.get(pC)!,
            linkedProductUuid: uuids.get(pA)!,
            type: 'related',
            sortOrder: 99999999999
          },
          db
        )
      ).rejects.toMatchObject({ status: 400 });
    });

    it('drops malformed rule items instead of nulling the admin Product (non-null chain)', async () => {
      await db.query(
        `UPDATE product SET related_products_mode = 'custom', related_products_rules = $2
         WHERE product_id = $1`,
        [
          anchor,
          JSON.stringify({
            enabled: true,
            rules: [{}, { type: 'bogus', enabled: true }, { type: 'same_category', enabled: true }]
          })
        ]
      );
      const effective = await adminResolvers.Product.effectiveRelatedProductsRules(
        { productId: anchor },
        {},
        ctx()
      );
      expect(effective.rules).toEqual([{ type: 'same_category', enabled: true }]);
      const raw = await adminResolvers.Product.relatedProductsRules(
        { productId: anchor },
        {},
        ctx()
      );
      expect(raw?.rules).toEqual([{ type: 'same_category', enabled: true }]);
      await db.query(
        `UPDATE product SET related_products_mode = 'inherit', related_products_rules = NULL
         WHERE product_id = $1`,
        [anchor]
      );
    });

    it('shows picks whose product lacks an inventory row (LEFT JOIN, still flagged hidden)', async () => {
      const orphan = (
        await db.query(
          `INSERT INTO product (sku, price, status, visibility)
           VALUES ('orphan', 10, TRUE, TRUE) RETURNING product_id`
        )
      ).rows[0].product_id;
      await db.query(
        `INSERT INTO product_description (product_description_product_id, name, url_key)
         VALUES ($1, 'Orphan', 'orphan')`,
        [orphan]
      );
      await db.query(
        `INSERT INTO product_link (product_id, linked_product_id, type, sort_order)
         VALUES ($1, $2, 'related', 99)`,
        [anchor, orphan]
      );
      const rows = await adminResolvers.Product.productLinks(
        { productId: anchor },
        { type: 'related' },
        ctx()
      );
      const orphanRow = rows.find(
        (row: { product: { productId?: number } | null }) =>
          (row.product as { productId?: number } | null)?.productId === orphan
      );
      expect(orphanRow).toBeTruthy();
      expect(orphanRow).toMatchObject({
        hiddenOnStorefront: true,
        hiddenReason: 'catalog_filter'
      });
      await db.query('DELETE FROM product_link WHERE linked_product_id = $1', [
        orphan
      ]);
    });

    it('crossSellResolved shows the shelf as shoppers see it, incl. fallback sources', async () => {
      // anchor has co-purchase candidates (pA passes gates) AND fallback fills
      // the remaining slots — the resolved list must tag both distinctly.
      const rows = await adminResolvers.Product.crossSellResolved(
        { productId: anchor },
        { limit: 6 },
        ctx()
      );
      const bySource = new Map(
        rows.map((row) => [
          (row.product as { productId: number }).productId,
          row.source
        ])
      );
      expect(bySource.get(pA)).toBe('co_purchase');
      const pARow = rows.find(
        (row) => (row.product as { productId: number }).productId === pA
      ) as unknown as { salesCount: number };
      expect(pARow.salesCount).toBe(20); // fixture stat for pA
      // pC fails the lift gate as a candidate but reappears via the ladder.
      expect(['category_bestsellers', 'store_bestsellers']).toContain(
        bySource.get(pC)
      );
    });

    it('relatedProductsResolved tags every row with its waterfall source', async () => {
      const rows = await adminResolvers.Product.relatedProductsResolved(
        { productId: anchor },
        { limit: 10 },
        ctx()
      );
      const sources = new Map(
        rows.map((row) => [
          (row.product as { productId: number }).productId,
          row.source
        ])
      );
      expect(sources.get(pA)).toBe('manual'); // linked in the CRUD test
      // pC is uncategorized → arrives via the bestseller fallback rung.
      expect(sources.get(pC)).toBe('bestsellers_fallback');
    });
  });
});

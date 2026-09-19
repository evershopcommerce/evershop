import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Pool } from 'pg';
import migrate from '../../migration/Version-1.0.14.js';
import { recomputeRecommendationStats } from '../../services/recommendation/recomputeStats.js';

/**
 * DB-backed verification of the recompute pass (spec § 7, § 15) against a
 * scratch database on the local Postgres server. Doubles as execution proof
 * for the Version-1.0.14 DDL: the scratch schema is stub base tables + the
 * REAL migration.
 *
 * Self-skipping: when no Postgres server is reachable (CI without a DB), the
 * whole suite is describe.skip — it must never fail for want of a server.
 */

jest.setTimeout(30000);

const SCRATCH_DB = 'evershop_reco_scratch_test';

function poolConfig(database: string) {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || undefined,
    password: process.env.DB_PASSWORD || undefined,
    database
  };
}

/**
 * The probe must prove everything beforeAll needs, not just reachability:
 * PG13+ (DROP DATABASE ... WITH (FORCE)) and CREATEDB privilege — proven by
 * actually creating the scratch DB here. Any shortfall → clean skip.
 */
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

if (!serverAvailable) {
  // eslint-disable-next-line no-console
  console.warn(
    'recomputeStats.test: no local Postgres reachable — DB-backed suite skipped'
  );
}

describeDb('recomputeRecommendationStats (scratch DB)', () => {
  let admin: Pool;
  let db: Pool;
  // Fixture ids
  let v1a: number;
  let v1b: number;
  let p3: number;
  let p4: number;
  let p5: number;
  let o1: number;

  async function addProduct(variantGroupId: number | null): Promise<number> {
    const r = await db.query(
      'INSERT INTO product (variant_group_id) VALUES ($1) RETURNING product_id',
      [variantGroupId]
    );
    return r.rows[0].product_id;
  }

  async function addOrder(
    productIds: Array<{ productId: number; qty?: number }>,
    status = 'new'
  ): Promise<number> {
    const r = await db.query(
      'INSERT INTO "order" (status) VALUES ($1) RETURNING order_id',
      [status]
    );
    const orderId = r.rows[0].order_id;
    for (const line of productIds) {
      await db.query(
        'INSERT INTO order_item (order_item_order_id, product_id, qty) VALUES ($1, $2, $3)',
        [orderId, line.productId, line.qty || 1]
      );
    }
    return orderId;
  }

  async function statRows() {
    const r = await db.query(
      'SELECT product_id, order_count FROM product_stat ORDER BY product_id'
    );
    return r.rows;
  }

  async function relationRows() {
    const r = await db.query(
      `SELECT product_id, related_product_id, co_purchase_count
       FROM product_relation ORDER BY product_id, related_product_id`
    );
    return r.rows;
  }

  beforeAll(async () => {
    // The scratch DB already exists — probeServer created it (its existence
    // IS the privilege check). This hook only builds schema and fixtures.
    admin = new Pool({ ...poolConfig('postgres'), max: 1 });
    db = new Pool({ ...poolConfig(SCRATCH_DB), max: 5 });

    // Stub base tables (only the columns the migration and the recompute
    // touch), then the REAL migration on top.
    await db.query(`
      CREATE TABLE product (
        product_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        variant_group_id INT,
        category_id INT
      );
      CREATE TABLE category (
        category_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
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

    // Fixtures (spec § 15):
    // - v1a + v1b form variant group 10; representative = MIN(product_id) = v1a
    // - o1: v1a + p3                      → (group, p3) co-occurrence
    // - o2: v1b + p3 ×2 lines, qty 3     → still ONE (group, p3) co-occurrence
    // - o3: CANCELED v1a + p3            → excluded everywhere
    // - o4: p3 + p4                      → (p3, p4)
    // - o5: deleted product 9999 + p4    → 9999 skipped; order still counts
    // - o6: p4 alone                     → stat only, no pairs
    // - p5: never ordered                → no rows anywhere
    v1a = await addProduct(10);
    v1b = await addProduct(10);
    p3 = await addProduct(null);
    p4 = await addProduct(null);
    p5 = await addProduct(null);
    o1 = await addOrder([{ productId: v1a }, { productId: p3 }]);
    await addOrder([
      { productId: v1b },
      { productId: p3 },
      { productId: p3, qty: 3 }
    ]);
    await addOrder([{ productId: v1a }, { productId: p3 }], 'canceled');
    await addOrder([{ productId: p3 }, { productId: p4 }]);
    await addOrder([{ productId: 9999 }, { productId: p4 }]);
    await addOrder([{ productId: p4 }]);
  });

  afterAll(async () => {
    if (db) {
      await db.end().catch(() => {});
    }
    if (admin) {
      await admin.query(
        `DROP DATABASE IF EXISTS ${SCRATCH_DB} WITH (FORCE)`
      ).catch(() => {});
      await admin.end().catch(() => {});
    }
  });

  it('backfills all history in one pass with variant rollup, dedup, canceled/deleted exclusion', async () => {
    const result = await recomputeRecommendationStats(db);

    // 6 orders minus the canceled one.
    expect(result.totalOrderCount).toBe(5);
    expect(result.computedAt).toBeTruthy();

    // Stats keyed by representative: group 10 rolls up to v1a.
    expect(await statRows()).toEqual([
      { product_id: v1a, order_count: 2 }, // o1, o2 (via v1b → rep v1a)
      { product_id: p3, order_count: 3 }, // o1, o2 (deduped), o4
      { product_id: p4, order_count: 3 } // o4, o5, o6
    ]);

    // Directed pairs, both directions; qty/duplicate lines count once.
    expect(await relationRows()).toEqual([
      { product_id: v1a, related_product_id: p3, co_purchase_count: 2 },
      { product_id: p3, related_product_id: v1a, co_purchase_count: 2 },
      { product_id: p3, related_product_id: p4, co_purchase_count: 1 },
      { product_id: p4, related_product_id: p3, co_purchase_count: 1 }
    ]);
    expect(result.pairCount).toBe(4);

    // Meta row: same eligible-order universe as the counts.
    const meta = await db.query('SELECT * FROM product_stat_meta');
    expect(meta.rows).toHaveLength(1);
    expect(meta.rows[0].total_order_count).toBe(5);
    expect(meta.rows[0].computed_at).not.toBeNull();

    // Structural invariant: confidence = co / orders(anchor) ≤ 1, both sides.
    const violation = await db.query(
      `SELECT COUNT(*) AS n
       FROM product_relation r
       JOIN product_stat sa ON sa.product_id = r.product_id
       JOIN product_stat sb ON sb.product_id = r.related_product_id
       WHERE r.co_purchase_count > sa.order_count
          OR r.co_purchase_count > sb.order_count`
    );
    expect(parseInt(violation.rows[0].n, 10)).toBe(0);

    // p5 (never ordered) has no rows at all.
    const p5Rows = await db.query(
      'SELECT 1 FROM product_stat WHERE product_id = $1',
      [p5]
    );
    expect(p5Rows.rowCount).toBe(0);
  });

  it('is idempotent: a second run produces byte-identical tables', async () => {
    const before = {
      stats: await statRows(),
      relations: await relationRows()
    };
    await recomputeRecommendationStats(db);
    expect(await statRows()).toEqual(before.stats);
    expect(await relationRows()).toEqual(before.relations);
  });

  it('serializes concurrent runs via the advisory lock (no duplicate-PK failures)', async () => {
    const [a, b] = await Promise.all([
      recomputeRecommendationStats(db),
      recomputeRecommendationStats(db)
    ]);
    expect(a.totalOrderCount).toBe(5);
    expect(b.totalOrderCount).toBe(5);
    expect(await statRows()).toHaveLength(3);
  });

  it('drops a later-canceled order from counts, denominators, and total on the next run', async () => {
    await db.query(`UPDATE "order" SET status = 'canceled' WHERE order_id = $1`, [
      o1
    ]);
    const result = await recomputeRecommendationStats(db);

    expect(result.totalOrderCount).toBe(4);
    expect(await statRows()).toEqual([
      { product_id: v1a, order_count: 1 }, // only o2 now
      { product_id: p3, order_count: 2 }, // o2, o4
      { product_id: p4, order_count: 3 }
    ]);
    expect(await relationRows()).toEqual([
      { product_id: v1a, related_product_id: p3, co_purchase_count: 1 },
      { product_id: p3, related_product_id: v1a, co_purchase_count: 1 },
      { product_id: p3, related_product_id: p4, co_purchase_count: 1 },
      { product_id: p4, related_product_id: p3, co_purchase_count: 1 }
    ]);

    // Restore for any later suite additions.
    await db.query(`UPDATE "order" SET status = 'new' WHERE order_id = $1`, [o1]);
  });

  it('skips oversized orders during PAIRING only when maxOrderKeys is set (§ 17.1)', async () => {
    // Resync the tables with current order state first — the previous test
    // restored o1 AFTER its last recompute, so the stored rows lag it.
    await recomputeRecommendationStats(db);
    const baselineRelations = await relationRows();
    // 4 distinct group keys in one order: group(v1b→rep v1a), p3, p4, p5.
    const bigOrder = await addOrder([
      { productId: v1b },
      { productId: p3 },
      { productId: p4 },
      { productId: p5 }
    ]);

    const guarded = await recomputeRecommendationStats(db, { maxOrderKeys: 3 });
    // No new pairs from the oversized order…
    expect(await relationRows()).toEqual(baselineRelations);
    // …but it still counts toward stats and the total (conservative bias).
    expect(guarded.totalOrderCount).toBe(6);
    const p5Stat = await db.query(
      'SELECT order_count FROM product_stat WHERE product_id = $1',
      [p5]
    );
    expect(p5Stat.rows[0].order_count).toBe(1);

    // Unguarded rerun picks the pairs up — proving the guard was the filter.
    await recomputeRecommendationStats(db);
    const unguarded = await relationRows();
    expect(unguarded.length).toBeGreaterThan(baselineRelations.length);
    expect(
      unguarded.some(
        (row: { product_id: number; related_product_id: number }) =>
          row.product_id === p4 && row.related_product_id === p5
      )
    ).toBe(true);

    // Clean up so the suite stays order-independent for future additions.
    await db.query('DELETE FROM order_item WHERE order_item_order_id = $1', [
      bigOrder
    ]);
    await db.query('DELETE FROM "order" WHERE order_id = $1', [bigOrder]);
    await recomputeRecommendationStats(db);
  });
});

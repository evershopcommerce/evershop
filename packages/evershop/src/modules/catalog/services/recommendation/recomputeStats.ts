import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import type { Pool } from 'pg';
import { emit } from '../../../../lib/event/emitter.js';
import { warning } from '../../../../lib/log/logger.js';
import { pool as appPool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';

/**
 * Rebuild the co-purchase statistics tables from order history in one
 * idempotent pass (spec § 7.3). This is the ONLY writer of product_stat /
 * product_relation / product_stat_meta — no triggers, no event subscribers
 * (spec D1: the event bus is at-most-once, and per-order pair upserts would
 * put O(items²) work inside checkout).
 *
 * One transaction:
 *   1. pg_advisory_xact_lock serializes concurrent recomputes (cron vs the
 *      admin button): the second writer waits, then rebuilds from newer data.
 *      Without it, the loser's stale-snapshot DELETE misses the winner's rows
 *      and its INSERT dies on duplicate PKs.
 *   2. The `line` set is materialized into a TEMP table, NOT data-modifying
 *      CTEs: WITH sub-statements run in unspecified order against a single
 *      snapshot, so a same-statement DELETE + INSERT into product_stat could
 *      collide on the PK. Separate statements in one tx have no such hazard.
 *   3. DELETE (not TRUNCATE) keeps the swap MVCC-friendly: concurrent PDP
 *      reads see the previous data until commit, never an empty table.
 *
 * Eligible-order universe (§ 7.1): every order whose status <> 'canceled' —
 * the SAME predicate for pair counts, per-product counts, and the lift
 * denominator, so confidence = co / orders(A) is structurally ≤ 1.
 *
 * Variant rollup (§ 7.2): order lines map to a representative key —
 * MIN(product_id) of the CURRENT variant group, or the product's own id.
 * DISTINCT (order_id, key) collapses qty > 1, duplicate lines, and multiple
 * variants of one group to a single co-occurrence. The INNER JOIN to product
 * drops lines whose product was deleted (order_item keeps historical ids).
 *
 * Reads order/order_item from the checkout module (read-only). Columns used:
 * "order".order_id, "order".status, order_item.order_item_order_id,
 * order_item.product_id — grep here before dropping any of them.
 */

const RECOMPUTE_ADVISORY_LOCK_KEY = 749120501;

export interface RecomputeStatsResult {
  computedAt: string;
  totalOrderCount: number;
  /** Directed rows written to product_relation (2 × unordered pairs). */
  pairCount: number;
}

export async function recomputeRecommendationStats(
  pool: Pool = appPool as unknown as Pool,
  options: {
    /**
     * Orders with more distinct group keys than this are skipped during
     * PAIRING only (§ 17.1 — wholesale/B2B noise emits O(N²) pairs); they
     * still count toward product_stat and the total, a deliberately
     * conservative bias. 0 = disabled (the default).
     */
    maxOrderKeys?: number;
  } = {}
): Promise<RecomputeStatsResult> {
  const maxOrderKeys =
    options.maxOrderKeys ?? getConfig('catalog.crossSell.maxOrderKeys', 0);
  const connection = await pool.connect();
  try {
    await startTransaction(connection);
    await connection.query('SELECT pg_advisory_xact_lock($1)', [
      RECOMPUTE_ADVISORY_LOCK_KEY
    ]);

    await connection.query(
      `CREATE TEMP TABLE reco_line ON COMMIT DROP AS
       SELECT DISTINCT
         oi.order_item_order_id AS order_id,
         COALESCE(g.rep_id, p.product_id) AS product_key
       FROM order_item oi
       INNER JOIN "order" o
         ON o.order_id = oi.order_item_order_id AND o.status <> 'canceled'
       INNER JOIN product p ON p.product_id = oi.product_id
       LEFT JOIN (
         SELECT variant_group_id, MIN(product_id) AS rep_id
         FROM product
         WHERE variant_group_id IS NOT NULL
         GROUP BY variant_group_id
       ) g ON g.variant_group_id = p.variant_group_id`
    );

    await connection.query('DELETE FROM product_relation');
    await connection.query('DELETE FROM product_stat');

    // The EXISTS re-checks guard the READ COMMITTED gap between the temp-table
    // snapshot and each INSERT's own snapshot: a product deleted mid-run would
    // otherwise abort the whole pass on the FK. The residual race (a delete
    // committing between the INSERT's snapshot and its FK check) still aborts,
    // but CASCADE + the next run self-heal.
    await connection.query(
      `INSERT INTO product_stat (product_id, order_count)
       SELECT product_key, COUNT(*)
       FROM reco_line
       WHERE EXISTS (
         SELECT 1 FROM product p WHERE p.product_id = reco_line.product_key
       )
       GROUP BY product_key`
    );

    const pairingGuard =
      maxOrderKeys > 0
        ? `AND a.order_id NOT IN (
             SELECT order_id FROM reco_line
             GROUP BY order_id
             HAVING COUNT(*) > $1
           )`
        : '';
    const relationResult = await connection.query(
      `INSERT INTO product_relation (product_id, related_product_id, co_purchase_count)
       SELECT a.product_key, b.product_key, COUNT(*)
       FROM reco_line a
       INNER JOIN reco_line b
         ON a.order_id = b.order_id AND a.product_key <> b.product_key
       WHERE EXISTS (
         SELECT 1 FROM product pa WHERE pa.product_id = a.product_key
       )
       AND EXISTS (
         SELECT 1 FROM product pb WHERE pb.product_id = b.product_key
       )
       ${pairingGuard}
       GROUP BY a.product_key, b.product_key`,
      maxOrderKeys > 0 ? [maxOrderKeys] : []
    );

    const metaResult = await connection.query(
      `INSERT INTO product_stat_meta (id, total_order_count, computed_at)
       VALUES (
         1,
         (SELECT COUNT(*) FROM "order" WHERE status <> 'canceled'),
         CURRENT_TIMESTAMP
       )
       ON CONFLICT (id) DO UPDATE
         SET total_order_count = EXCLUDED.total_order_count,
             computed_at = EXCLUDED.computed_at
       RETURNING total_order_count, computed_at`
    );

    await commit(connection);

    const result: RecomputeStatsResult = {
      // pg returns a Date for timestamptz — normalize so the declared string
      // type is true for in-process consumers, not just after JSON.stringify.
      computedAt: new Date(metaResult.rows[0].computed_at).toISOString(),
      totalOrderCount: parseInt(metaResult.rows[0].total_order_count, 10),
      pairCount: relationResult.rowCount || 0
    };
    // Best-effort (§ 17.2): extensions can react (cache busting, exports),
    // but a failed event insert must never fail a successful recompute —
    // the stats are already committed.
    try {
      await emit('recommendation_stats_recomputed', { ...result });
    } catch (eventError) {
      warning(
        `recommendation_stats_recomputed event not emitted: ${(eventError as Error).message}`
      );
    }
    return result;
  } catch (e) {
    try {
      await rollback(connection);
    } catch (rollbackError) {
      // A dead connection rejects the ROLLBACK query before the query
      // builder reaches its release() — destroy the client instead of
      // leaking it from the shared pool, and let the ORIGINAL error
      // propagate, not the rollback failure.
      connection.release(rollbackError as Error);
    }
    throw e;
  }
}

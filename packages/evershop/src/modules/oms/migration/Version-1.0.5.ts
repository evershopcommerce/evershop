import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Multi-shipment refactor — drop the pre-shipped state.
 *
 * Stock is deducted at order placement, so a shipment row touches no
 * inventory — there's no reason to model a pre-shipped state. New
 * shipments now land directly in the `shipped` phase. The `pending` and
 * `processing` shipment statuses are removed from the default registry, and
 * there is no `pending` shipment phase at all. `pending` survives only as an
 * ORDER-level rollup value meaning "no items shipped yet."
 *
 * This migration sweeps existing dev-DB rows so no shipment row references
 * an unregistered status code. Production DBs that haven't yet installed
 * 1.0.3 pick up the new default + the in-migration backfill in that file;
 * DBs that already ran 1.0.3 (legacy `pending`-default) need this sweep.
 *
 * Idempotent — running twice is a no-op once all `pending` / `processing`
 * rows have been collapsed.
 */
export default async (connection: PoolClient) => {
  await execute(
    connection,
    `UPDATE "shipment"
        SET "status" = 'shipped'
      WHERE "status" IN ('pending', 'processing')`
  );

  await execute(
    connection,
    `ALTER TABLE "shipment" ALTER COLUMN "status" SET DEFAULT 'shipped'`
  );
};

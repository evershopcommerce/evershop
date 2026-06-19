import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Multi-shipment refactor — Phase A1 (additive only).
 *
 * Splits the legacy 1:1 `order ↔ shipment` model into a one-to-many model where
 * each shipment carries its own status and the set of order items it contains.
 *
 * Adds:
 *   - shipment.status, shipped_at, delivered_at, canceled_at columns
 *   - shipment_item junction table (shipment × order_item × qty)
 *
 * Backfills:
 *   - shipment.status from order.shipment_status (1:1 invariant, legacy)
 *   - shipment.{shipped_at, delivered_at, canceled_at} from shipment.created_at /
 *     updated_at, approximated by the order's stored shipment_status
 *   - shipment_item rows for every existing (shipment × shippable order_item) pair
 *     at full qty. Digital items (no_shipping_required = true) are skipped — they
 *     don't belong in shipment_item per the new model. All-digital orders had a
 *     vestigial shipment row created by the legacy `createShipmentForVirtualProductsOrder`
 *     hook; those shipments end up with zero shipment_item rows, which is fine
 *     because the rollup math short-circuits on items count.
 *
 * NO drops in this migration. `order.shipment_status` stays in place until Z1.
 *
 * See wiki/multi-shipment-design.md → "Schema" + "Migration plan" Phase A1.
 */
export default async (connection: PoolClient) => {
  /* ────────────────────────────────────────────────────────────────────────
   * 1. Add new columns to `shipment`.
   * ──────────────────────────────────────────────────────────────────────── */

  await execute(
    connection,
    `ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "status" varchar NOT NULL DEFAULT 'shipped'`
  );
  await execute(
    connection,
    `ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "shipped_at" TIMESTAMP WITH TIME ZONE`
  );
  await execute(
    connection,
    `ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP WITH TIME ZONE`
  );
  await execute(
    connection,
    `ALTER TABLE "shipment" ADD COLUMN IF NOT EXISTS "canceled_at" TIMESTAMP WITH TIME ZONE`
  );

  /* ────────────────────────────────────────────────────────────────────────
   * 2. Create `shipment_item` junction table.
   * ──────────────────────────────────────────────────────────────────────── */

  await execute(
    connection,
    `CREATE TABLE IF NOT EXISTS "shipment_item" (
      "shipment_item_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "shipment_id" INT NOT NULL,
      "order_item_id" INT NOT NULL,
      "qty" INT NOT NULL CHECK ("qty" > 0),
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT "SHIPMENT_ITEM_UUID_UNIQUE" UNIQUE ("uuid"),
      CONSTRAINT "SHIPMENT_ITEM_UNIQUE" UNIQUE ("shipment_id", "order_item_id"),
      CONSTRAINT "FK_SI_SHIPMENT" FOREIGN KEY ("shipment_id")
        REFERENCES "shipment" ("shipment_id") ON DELETE CASCADE,
      CONSTRAINT "FK_SI_ORDER_ITEM" FOREIGN KEY ("order_item_id")
        REFERENCES "order_item" ("order_item_id") ON DELETE CASCADE
    )`
  );

  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_SI_SHIPMENT" ON "shipment_item" ("shipment_id")`
  );
  await execute(
    connection,
    `CREATE INDEX IF NOT EXISTS "IDX_SI_ORDER_ITEM" ON "shipment_item" ("order_item_id")`
  );

  /* ────────────────────────────────────────────────────────────────────────
   * 3. Backfill shipment_item from existing shipments.
   *
   * Legacy invariant: one shipment per order, "containing" every shippable
   * order_item at full qty. Digital items (no_shipping_required = TRUE) are
   * excluded — they shouldn't appear in shipment_item per the new model.
   *
   * Note `order_item.order_item_order_id` is the FK column to "order".
   * `ON CONFLICT DO NOTHING` makes this idempotent if the migration is
   * partially re-run (unlikely under normal flow, but safe).
   * ──────────────────────────────────────────────────────────────────────── */

  await execute(
    connection,
    `INSERT INTO "shipment_item" ("shipment_id", "order_item_id", "qty")
       SELECT s."shipment_id", oi."order_item_id", oi."qty"
       FROM "shipment" s
       JOIN "order_item" oi ON oi."order_item_order_id" = s."shipment_order_id"
       WHERE oi."no_shipping_required" = FALSE
       ON CONFLICT ("shipment_id", "order_item_id") DO NOTHING`
  );

  /* ────────────────────────────────────────────────────────────────────────
   * 4. Backfill shipment.status + timestamps from order.shipment_status.
   *
   * Approximations:
   *   - shipped_at uses shipment.created_at (the moment legacy createShipment ran).
   *   - delivered_at / canceled_at use shipment.updated_at — best available since
   *     the activity log carries the real timestamps but isn't structured.
   *   - Legacy `pending` / `processing` shipment-level statuses collapse to
   *     `shipped` (the new model has no pre-shipped state — a shipment row
   *     exists iff something was actually shipped). The first COALESCE
   *     defaults to 'shipped' for orders with no shipment_status at all.
   * ──────────────────────────────────────────────────────────────────────── */

  await execute(
    connection,
    `UPDATE "shipment" s
        SET "status"       = CASE
                               WHEN o."shipment_status" IN ('pending', 'processing')
                                 THEN 'shipped'
                               ELSE COALESCE(o."shipment_status", 'shipped')
                             END,
            "shipped_at"   = CASE
                               WHEN o."shipment_status" IN ('shipped', 'delivered') THEN s."created_at"
                               ELSE NULL
                             END,
            "delivered_at" = CASE
                               WHEN o."shipment_status" = 'delivered' THEN s."updated_at"
                               ELSE NULL
                             END,
            "canceled_at"  = CASE
                               WHEN o."shipment_status" = 'canceled' THEN s."updated_at"
                               ELSE NULL
                             END
        FROM "order" o
       WHERE s."shipment_order_id" = o."order_id"`
  );
};

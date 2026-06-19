import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Backfill order.shipment_status for rows the 1.0.5 sweep left stranded.
 *
 * Migration 1.0.5 collapsed every legacy `pending` / `processing` shipment
 * row to `status='shipped'`, but did NOT recompute the order-level rollup
 * column. So orders created before §1 still show `shipment_status='pending'`
 * even though their underlying shipments now read `shipped`.
 *
 * This migration replays the rollup math in SQL — but only for rows where
 * `order.shipment_status = 'pending'` AND the computed value is more
 * specific. Orders where the current value is `shipped` / `delivered` /
 * `partially_*` are left alone; the math could disagree with them for
 * unrelated reasons (a manually-canceled shipment after delivery, fixture
 * data from pre-rollup releases) and silently downgrading them would lose
 * information the user expects to see.
 *
 * The math mirrors `services/shipment/resolveShipmentRollup.ts`: sum
 * shipment_item qty per phase (canceled shipments contribute zero), apply
 * the rule priority `all:delivered` → `any:delivered` → `all:shipped` →
 * `any:shipped` → `all:pending` → default `pending`.
 *
 * Hardcoded phase mapping assumes the post-§1 default registry
 * (`shipped` / `delivered` / `canceled`). Custom extension statuses that
 * fall through to the `ELSE` branch get treated as the `shipped` phase —
 * a reasonable default for legacy data. The runtime rollup reads phase
 * from the registry dynamically and handles custom statuses correctly.
 * Idempotent.
 */
export default async (connection: PoolClient) => {
  await execute(
    connection,
    `
WITH item_progress AS (
  SELECT
    oi."order_item_order_id" AS order_id,
    oi."order_item_id",
    oi."qty" AS qty_ordered,
    COALESCE(
      SUM(CASE WHEN s."status" = 'delivered' THEN si."qty" ELSE 0 END),
      0
    ) AS qty_delivered,
    COALESCE(
      SUM(CASE WHEN s."status" NOT IN ('delivered', 'canceled') AND s."status" IS NOT NULL THEN si."qty" ELSE 0 END),
      0
    ) AS qty_shipped
  FROM "order_item" oi
  LEFT JOIN "shipment_item" si ON si."order_item_id" = oi."order_item_id"
  LEFT JOIN "shipment" s       ON s."shipment_id"    = si."shipment_id"
  WHERE oi."no_shipping_required" = FALSE
  GROUP BY oi."order_item_order_id", oi."order_item_id", oi."qty"
),
order_stats AS (
  SELECT
    order_id,
    BOOL_AND(qty_delivered = qty_ordered)                   AS all_delivered,
    BOOL_OR (qty_delivered > 0)                             AS any_delivered,
    BOOL_AND(qty_shipped + qty_delivered = qty_ordered)     AS all_shipped,
    BOOL_OR (qty_shipped + qty_delivered > 0)               AS any_shipped,
    BOOL_AND(qty_shipped = 0 AND qty_delivered = 0)         AS all_pending,
    COUNT(*) > 0                                            AS has_physical
  FROM item_progress
  GROUP BY order_id
),
order_rollup AS (
  SELECT
    o.order_id,
    o.shipment_status AS current_rollup,
    CASE
      WHEN o."status" = 'canceled'      THEN 'canceled'
      WHEN NOT os.has_physical          THEN 'delivered'         -- all-digital order
      WHEN os.all_delivered             THEN 'delivered'
      WHEN os.any_delivered             THEN 'partially_delivered'
      WHEN os.all_shipped               THEN 'shipped'
      WHEN os.any_shipped               THEN 'partially_shipped'
      ELSE 'pending'
    END AS new_rollup
  FROM "order" o
  LEFT JOIN order_stats os ON os.order_id = o.order_id
)
UPDATE "order" o
   SET "shipment_status" = r.new_rollup
  FROM order_rollup r
 WHERE o."order_id"        = r.order_id
   AND o."shipment_status" = 'pending'
   AND r.new_rollup        != 'pending';
    `
  );
};

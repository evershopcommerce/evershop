import type { PoolClient } from 'pg';
import { pool } from '../../../../lib/postgres/connection.js';
import { getConfig } from '../../../../lib/util/getConfig.js';
import {
  hookable,
  hookAfter,
  hookBefore
} from '../../../../lib/util/hookable.js';
import { getValueSync } from '../../../../lib/util/registry.js';
import type { ShipmentStatus } from '../../../../types/order.js';
import type { OrderShipmentRollup } from '../../types/orderShipmentRollup.js';
import type { ShipmentPhase } from '../../types/shipmentPhase.js';

/**
 * The "ambient" data the rollup needs about the order — read it once and
 * pass it in so callers can short-circuit without an extra DB roundtrip.
 */
export interface RollupOrderSummary {
  order_id: number;
  order_status: string | null;
}

/**
 * Aggregate stats produced by the item-level math. The booleans drive the
 * predicate vocabulary `all:<phase>` / `any:<phase>`. `shippableItemsCount`
 * lets the all-digital short-circuit trip without a second query.
 *
 * See wiki/multi-shipment-design.md → "Item-based rollup math".
 */
export interface RollupStats {
  shippableItemsCount: number;
  allDelivered: boolean;
  anyDelivered: boolean;
  allShipped: boolean;
  anyShipped: boolean;
  allCanceled: boolean;
  anyCanceled: boolean;
  allPending: boolean;
}

/**
 * Per-(order_item, shipment_status) row returned by the rollup SQL. App code
 * buckets these into phases via the status registration in
 * `getConfig('oms.order.shipmentStatus')`.
 */
interface RawRollupRow {
  order_item_id: number;
  qty_ordered: number;
  status: string | null;
  qty: number | null;
}

/**
 * Build a Map<statusCode, phase> from the registered shipment statuses.
 * Phase is hardcoded vocabulary; statuses are config-driven. We resolve
 * at read time rather than storing phase on the shipment row.
 */
function statusToPhaseMap(): Record<string, ShipmentPhase> {
  const list = getConfig('oms.order.shipmentStatus', {}) as unknown as Record<
    string,
    ShipmentStatus
  >;
  const out: Record<string, ShipmentPhase> = {};
  for (const [code, detail] of Object.entries(list)) {
    out[code] = detail.phase;
  }
  return out;
}

/**
 * Run the per-item GROUP BY query, filtered to shippable items only. Returns
 * one row per (order_item, distinct shipment status that ever covered that
 * item). order_items with no shipment_item rows still appear once with
 * status=NULL, qty=NULL — that's how "qty_unshipped > 0" gets detected.
 */
async function fetchRollupRows(
  orderId: number,
  connection: PoolClient | typeof pool
): Promise<RawRollupRow[]> {
  const result = await connection.query(
    `SELECT oi.order_item_id,
            oi.qty AS qty_ordered,
            s.status,
            SUM(si.qty) AS qty
       FROM order_item oi
       LEFT JOIN shipment_item si ON si.order_item_id = oi.order_item_id
       LEFT JOIN shipment s       ON s.shipment_id    = si.shipment_id
      WHERE oi.order_item_order_id = $1
        AND oi.no_shipping_required = FALSE
      GROUP BY oi.order_item_id, oi.qty, s.status`,
    [orderId]
  );
  return result.rows as RawRollupRow[];
}

/**
 * Aggregate the raw rows into per-item totals by phase, then into the boolean
 * predicates the rule resolver consumes. Canceled quantities are tracked
 * separately (`qty_canceled`) so the canceled rules can fire, but a canceled
 * shipment still contributes zero to `qty_shipped` / `qty_delivered` — so an
 * item that was canceled and then re-shipped reads as shipped (the rule order
 * checks shipped/delivered before canceled). Unshipped items (no shipment_item
 * row) contribute to none of the three.
 */
export function aggregateRollupStats(rows: RawRollupRow[]): RollupStats {
  const phaseOf = statusToPhaseMap();
  const perItem = new Map<
    number,
    {
      qty_ordered: number;
      qty_shipped: number;
      qty_delivered: number;
      qty_canceled: number;
    }
  >();
  for (const row of rows) {
    const existing = perItem.get(row.order_item_id) ?? {
      qty_ordered: row.qty_ordered,
      qty_shipped: 0,
      qty_delivered: 0,
      qty_canceled: 0
    };
    const phase = row.status ? phaseOf[row.status] : null;
    const qty = row.qty ? Number(row.qty) : 0;
    if (phase === 'shipped') existing.qty_shipped += qty;
    if (phase === 'delivered') existing.qty_delivered += qty;
    if (phase === 'canceled') existing.qty_canceled += qty;
    perItem.set(row.order_item_id, existing);
  }

  const items = Array.from(perItem.values());
  return {
    shippableItemsCount: items.length,
    allDelivered: items.length > 0
      ? items.every((i) => i.qty_delivered === i.qty_ordered)
      : false,
    anyDelivered: items.some((i) => i.qty_delivered > 0),
    allShipped: items.length > 0
      ? items.every((i) => i.qty_shipped + i.qty_delivered === i.qty_ordered)
      : false,
    anyShipped: items.some((i) => i.qty_shipped + i.qty_delivered > 0),
    // `>=` (not `===`) so an item canceled across several shipments — or
    // canceled, re-shipped, and canceled again — still counts as fully
    // canceled. The shipped/delivered rules run first, so a re-shipped item
    // never reaches the canceled rules anyway.
    allCanceled: items.length > 0
      ? items.every((i) => i.qty_canceled >= i.qty_ordered)
      : false,
    anyCanceled: items.some((i) => i.qty_canceled > 0),
    allPending: items.length > 0
      ? items.every((i) => i.qty_shipped === 0 && i.qty_delivered === 0)
      : false
  };
}

/**
 * Apply the predicate→rollup rules from `oms.order.shipmentRollup` (config,
 * overridable via `addProcessor('shipmentRollup', ...)`). Priority order is
 * fixed in code, mirroring `resolveOrderStatus`'s wildcard-fallback order at
 * `services/updateOrderStatus.ts:65-69`.
 */
function applyRollupRules(
  order: RollupOrderSummary,
  stats: RollupStats
): OrderShipmentRollup {
  // Short-circuit 1: whole-order cancel.
  if (order.order_status === 'canceled') return 'canceled';
  // Short-circuit 2: all-digital order. "Fully shipped" is vacuously true.
  if (stats.shippableItemsCount === 0) return 'delivered';

  const defaults = (
    getConfig as unknown as (path: string, def: unknown) => unknown
  )('oms.order.shipmentRollup', {}) as Record<string, OrderShipmentRollup>;
  const map = getValueSync<Record<string, OrderShipmentRollup>>(
    'shipmentRollup',
    defaults,
    {}
  );

  if (stats.allDelivered && map['all:delivered']) return map['all:delivered'];
  if (stats.anyDelivered && map['any:delivered']) return map['any:delivered'];
  if (stats.allShipped   && map['all:shipped'])   return map['all:shipped'];
  if (stats.anyShipped   && map['any:shipped'])   return map['any:shipped'];
  // Canceled rules sit AFTER shipped/delivered (shipping progress wins) but
  // BEFORE `all:pending` — a fully/partially canceled order also satisfies
  // `allPending` (canceled items count zero toward shipped/delivered), so
  // checking `all:pending` first would mask both. `all:canceled` must precede
  // `any:canceled` for the same reason (all ⊂ any).
  if (stats.allCanceled  && map['all:canceled'])  return map['all:canceled'];
  if (stats.anyCanceled  && map['any:canceled'])  return map['any:canceled'];
  if (stats.allPending   && map['all:pending'])   return map['all:pending'];
  return 'pending';
}

/**
 * Pure function: given an order summary and pre-computed stats, return the
 * rollup. Exposed so callers (orderCreator, tests) can drive the math without
 * a DB hit when they already have the inputs.
 */
// Named function expression: `.name` must equal the `resolveShipmentRollup`
// hook key so `hookBefore/AfterResolveShipmentRollup` fire (hookable keys by
// the wrapped function's `.name`). See checkout.ts for the pattern.
const resolveShipmentRollupCore = async function resolveShipmentRollup(
  order: RollupOrderSummary,
  stats: RollupStats
): Promise<OrderShipmentRollup> {
  return applyRollupRules(order, stats);
}

/**
 * Compute the rollup for an order, hitting the DB once for stats and once
 * for the order summary (if not provided).
 *
 * **Hookable** via `hookBefore('resolveShipmentRollup')` /
 * `hookAfter('resolveShipmentRollup')` so an extension can short-circuit or
 * override the math (e.g. for returns).
 */
export async function resolveShipmentRollupForOrder(
  orderId: number,
  connection: PoolClient | typeof pool = pool,
  preloadedOrder?: RollupOrderSummary
): Promise<OrderShipmentRollup> {
  let order = preloadedOrder;
  if (!order) {
    const r = await connection.query(
      `SELECT order_id, status AS order_status FROM "order" WHERE order_id = $1 LIMIT 1`,
      [orderId]
    );
    if (r.rows.length === 0) {
      throw new Error(`Order ${orderId} not found`);
    }
    order = r.rows[0] as RollupOrderSummary;
  }
  const rows = await fetchRollupRows(orderId, connection);
  const stats = aggregateRollupStats(rows);
  return hookable(resolveShipmentRollupCore, { order, stats })(order, stats);
}

export function hookBeforeResolveShipmentRollup(
  callback: (
    this: { order: RollupOrderSummary; stats: RollupStats },
    ...args: [RollupOrderSummary, RollupStats]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('resolveShipmentRollup', callback, priority);
}

export function hookAfterResolveShipmentRollup(
  callback: (
    this: { order: RollupOrderSummary; stats: RollupStats },
    ...args: [RollupOrderSummary, RollupStats]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('resolveShipmentRollup', callback, priority);
}

import {
  update,
  type PoolClient
} from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../lib/util/hookable.js';
import type { OrderShipmentRollup } from '../types/orderShipmentRollup.js';
import {
  resolveShipmentRollupForOrder,
  type RollupOrderSummary
} from './shipment/resolveShipmentRollup.js';

/**
 * Internal helper — write the rollup to `order.shipment_status`. Hookable as
 * `changeShipmentStatus`, preserving the signature `(orderId, status, connection)`
 * that the existing `hookAfter('changeShipmentStatus')` in `oms/bootstrap.ts`
 * relies on to drive the psoMapping-based order-status recompute.
 *
 * The `status` arg passed to the hook IS the rollup output (one of the six
 * `OrderShipmentRollup` values), not a per-shipment status. The hook's
 * `resolveOrderStatus(payment_status, shipment_status)` call expects
 * `oms.order.psoMapping` to know about the new rollup states — defaults
 * for `partially_*` and `*:canceled` were added in A2.
 */
/**
 * Returns the updated order row (postgres-query-builder's `update().execute()`
 * resolves to the row with `RETURNING *`). The existing `bootstrap.ts`
 * `hookAfter('changeShipmentStatus')` is shaped
 * `async (order, orderId, status, connection)` where `order` is that returned
 * row — it reads `order.payment_status` and `order.status` from it. Keeping
 * the return shape preserves that contract.
 */
async function changeShipmentStatus(
  orderId: number,
  status: OrderShipmentRollup,
  connection: PoolClient | typeof pool
) {
  const row = await update('order')
    .given({ shipment_status: status })
    .where('order_id', '=', orderId)
    .execute(connection);
  return row;
}

/**
 * Recompute the order's `shipment_status` from the per-item rollup math and
 * persist it. Returns the new rollup value.
 *
 * Called by `updateShipmentStatus` (after every per-shipment status change)
 * and by `cancelOrder` (after cancelling shipments).
 *
 * **Hookable** at two layers:
 *   - `hookBefore/After('recomputeOrderShipmentStatus')` — wraps the whole
 *     compute+write cycle.
 *   - `hookBefore/After('changeShipmentStatus')` — wraps just the DB write
 *     of the rollup; the existing `oms/bootstrap.ts` hookAfter that drives
 *     order-status recompute via psoMapping still fires here.
 */
async function recomputeOrderShipmentStatus(
  orderId: number,
  connection: PoolClient | typeof pool = pool,
  preloadedOrder?: RollupOrderSummary
): Promise<OrderShipmentRollup> {
  const rollup = await resolveShipmentRollupForOrder(
    orderId,
    connection,
    preloadedOrder
  );
  await hookable(changeShipmentStatus, { orderId, status: rollup })(
    orderId,
    rollup,
    connection
  );
  return rollup;
}

export default hookable(recomputeOrderShipmentStatus, {});

export { recomputeOrderShipmentStatus };

export function hookBeforeRecomputeOrderShipmentStatus(
  callback: (
    this: Record<string, never>,
    ...args: [
      orderId: number,
      connection: PoolClient | typeof pool,
      preloadedOrder?: RollupOrderSummary
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('recomputeOrderShipmentStatus', callback, priority);
}

export function hookAfterRecomputeOrderShipmentStatus(
  callback: (
    this: Record<string, never>,
    ...args: [
      orderId: number,
      connection: PoolClient | typeof pool,
      preloadedOrder?: RollupOrderSummary
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('recomputeOrderShipmentStatus', callback, priority);
}

export function hookBeforeChangeShipmentStatus(
  callback: (
    this: { orderId: number; status: OrderShipmentRollup },
    ...args: [
      orderId: number,
      status: OrderShipmentRollup,
      connection: PoolClient | typeof pool
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('changeShipmentStatus', callback, priority);
}

export function hookAfterChangeShipmentStatus(
  callback: (
    this: { orderId: number; status: OrderShipmentRollup },
    ...args: [
      orderId: number,
      status: OrderShipmentRollup,
      connection: PoolClient | typeof pool
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('changeShipmentStatus', callback, priority);
}

/**
 * This function will be executed automatically after either shipment status or payment status is updated.
 */
import {
  commit,
  getConnection,
  insert,
  PoolClient,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import Topo from '@hapi/topo';
import { error } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { hookable, hookAfter, hookBefore } from '../../../lib/util/hookable.js';
import { getValueSync } from '../../../lib/util/registry.js';
import { OrderRow } from '../../../types/db/index.js';
import { PaymentStatus, ShipmentStatus } from '../../../types/order.js';

function getOrderStatusFlow() {
  try {
    const orderStatusList = getConfig('oms.order.status', {});
    const orderStatuses = new Topo.Sorter<string>();
    Object.keys(orderStatusList).forEach((status) => {
      orderStatuses.add(status, {
        before: orderStatusList[status].next,
        group: status
      });
    });
    return orderStatuses.nodes;
  } catch (err) {
    error(err);
    const message = `Failed to resolve order status. This is mostlikely due to the order status configuration. 
    Please check the configuration and try again. (${err.message})`;
    throw new Error(message);
  }
}

/**
 * Rollup outputs that live in `ROLLUP_DISPLAY` and `order.shipment_status` but
 * never as a registered entry in `oms.order.shipmentStatus`. The order-status
 * existence check has to tolerate these — the rollup writes them directly to
 * `order.shipment_status` after every shipment change, then `hookAfter('changeShipmentStatus')`
 * calls back here. Without this allowance, the first partial shipment on any
 * order throws inside the `updateShipmentStatus` transaction and rolls back.
 *
 * `pending` joined the rollup-only set after §1 of the change-notes pass —
 * we removed `pending` and `processing` from the shipment status registry
 * because no per-shipment row uses the `pending` phase anymore. But the
 * ORDER-level rollup still uses `'pending'` to mean "no items shipped yet"
 * (the canonical case: an order with one canceled shipment rolls up to
 * `pending`). Without `pending` here, canceling the only shipment on an
 * order throws "Shipment status 'pending' is invalid."
 */
const ROLLUP_ONLY_SHIPMENT_STATUSES = new Set([
  'pending',
  'partially_shipped',
  'partially_delivered',
  // Item-math output when some (not all) items are canceled and nothing has
  // shipped. `canceled` itself IS a registered shipment status, so it's not
  // listed here — only the partial summary word is rollup-only.
  'partially_canceled'
]);

export function resolveOrderStatus(
  paymentStatus: string,
  shipmentStatus: string
): string {
  const orderStatusList = getConfig('oms.order.status', {});
  const shipmentStatusList = getConfig(
    'oms.order.shipmentStatus',
    {}
  ) as Record<string, ShipmentStatus>;
  const paymentStatusList = getConfig('oms.order.paymentStatus', {}) as Record<
    string,
    PaymentStatus
  >;
  const psoMapping = getConfig('oms.order.psoMapping', {});
  const shipmentStatusDefination = shipmentStatusList[shipmentStatus];
  const paymentStatusDefination = paymentStatusList[paymentStatus];
  if (!paymentStatusDefination) {
    throw new Error(
      'Payment status is invalid. Can not update order status'
    );
  }
  if (
    !shipmentStatusDefination &&
    !ROLLUP_ONLY_SHIPMENT_STATUSES.has(shipmentStatus)
  ) {
    throw new Error(
      `Shipment status '${shipmentStatus}' is invalid. Can not update order status`
    );
  }
  const finalPsoMapping = getValueSync('psoMapping', psoMapping, {});
  // Resolution precedence: most specific first, then PAYMENT-wildcard before
  // SHIPMENT-wildcard. Payment-specific rules out-rank shipment-wildcard rules,
  // so terminal payment states dominate — a refunded order maps to `closed` and
  // a canceled order to `canceled` regardless of what happens to its shipments
  // (`<method>_refunded:*` beats `*:canceled`). Without this, canceling a
  // shipment on a refunded order would resolve to `processing` and the no-revert
  // guard would throw. See wiki/multi-shipment-design.md → "psoMapping precedence".
  const nextStatus =
    finalPsoMapping[`${paymentStatus}:${shipmentStatus}`] ||
    finalPsoMapping[`${paymentStatus}:*`] ||
    finalPsoMapping[`*:${shipmentStatus}`] ||
    finalPsoMapping['*:*'];
  if (!nextStatus || !orderStatusList[nextStatus]) {
    throw new Error(
      'Can not found a valid order status from the current shipment and payment status'
    );
  }
  return nextStatus;
}

/**
 * Whether an order status is terminal — no further lifecycle progression. A
 * terminal status has an empty `next` transition list (`closed`, `canceled` in
 * the defaults). Used to gate fulfillment actions declaratively: a shipment
 * cannot be created for a terminal order (a fully-refunded order is `closed`; a
 * canceled order is `canceled`). Reuses the status-flow config, so extensions
 * that register their own terminal statuses are covered automatically.
 */
export function isTerminalOrderStatus(
  status: string | null | undefined
): boolean {
  if (!status) {
    return false;
  }
  const orderStatusList = getConfig('oms.order.status', {}) as Record<
    string,
    { next?: string[] }
  >;
  const def = orderStatusList[status];
  return !!def && Array.isArray(def.next) && def.next.length === 0;
}

/**
 * Clamp a projected order status against where the order already is, so the
 * lifecycle only ever holds or moves forward — it never reverts and never
 * leaves a terminal state. This is the single place order-status "memory"
 * lives; `resolveOrderStatus` is a pure projection of (payment, shipment) and
 * knows nothing about the order's current status.
 *
 * Rules, in order:
 *   1. No current status yet (brand-new order) → accept the candidate.
 *   2. Current status is terminal (`closed`/`canceled` — empty `next`) → keep
 *      it. A refunded order stays `closed` however its shipments move; a
 *      canceled order stays `canceled`.
 *   3. Candidate sorts *before* the current status in the flow → keep current
 *      (no revert).
 *   4. Otherwise → adopt the candidate (forward progress).
 *
 * Because rules 2 and 3 return the *current* status, `changeOrderStatus`
 * becomes a no-op instead of an error. Before this, both cases THREW — from the
 * bootstrap `changePaymentStatus`/`changeShipmentStatus` hooks ("Order is
 * already closed") and from `changeOrderStatus` itself ("Can not revert") — and
 * the throw rolled back the enclosing transaction. That coupled a harmless
 * projection result (the order status simply can't move) to a hard failure of
 * the action the merchant actually took (cancel a shipment, record a refund).
 * The clamp decouples them: the action commits, the order status just holds.
 * A misconfigured `psoMapping` can no longer roll back a valid operation.
 *
 * @param flow  Topo-sorted order-status names, from `getOrderStatusFlow()`.
 */
export function clampOrderStatus(
  candidate: string,
  current: string | null | undefined,
  flow: string[]
): string {
  if (!current) {
    return candidate;
  }
  if (isTerminalOrderStatus(current)) {
    return current;
  }
  // No revert: a candidate that sorts before the current status holds. Same
  // comparison the old throw-guard used — only the reaction changed (hold, not
  // throw). `resolveOrderStatus` validates the candidate, so both are in `flow`.
  if (flow.indexOf(current) > flow.indexOf(candidate)) {
    return current;
  }
  return candidate;
}

/**
 * This function means to be private and should not be called outside of this module. It will not perform any validation and directly update the order status.
 * You should consider updating the payment status and shipment status only, and let the system to update the order status automatically.
 *
 * @param orderId
 * @param status
 * @param connection
 */
async function updateOrderStatus(
  orderId: number,
  status: string,
  connection: PoolClient
): Promise<void> {
  await update('order')
    .given({
      status
    })
    .where('order_id', '=', orderId)
    .execute(connection);
}

async function addOrderStatusChangeEvents(
  orderId: number,
  before: string,
  after: string,
  connection: PoolClient
): Promise<void> {
  await insert('event')
    .given({
      name: 'order_status_updated',
      data: {
        orderId: orderId,
        before,
        after
      }
    })
    .execute(connection);
}

export async function changeOrderStatus(
  orderId: number,
  status: string,
  conn?: PoolClient
) {
  const statusFlow = getOrderStatusFlow();
  const connection = conn || (await getConnection(pool));
  const order = (await select()
    .from('order')
    .where('order_id', '=', orderId)
    .load(connection, false)) as OrderRow | null;
  if (!order) {
    throw new Error('Order not found');
  }

  // Clamp the projected status against where the order already is: never leave a
  // terminal state, never revert. A clamp that returns the current status makes
  // this a no-op instead of throwing and rolling back the caller's transaction
  // (the shipment change / refund that triggered the recompute). See
  // `clampOrderStatus` and wiki/multi-shipment-design.md → "Order-status derivation".
  const finalStatus = clampOrderStatus(status, order.status, statusFlow);
  if (finalStatus === order.status) {
    return;
  }

  try {
    if (!conn) {
      await startTransaction(connection);
    }

    await hookable(updateOrderStatus, {
      order,
      status: finalStatus
    })(order.order_id, finalStatus, connection);

    await hookable(addOrderStatusChangeEvents, {
      order,
      status: finalStatus
    })(
      order.order_id,
      order.status ? order.status.toString() : 'unknown',
      finalStatus,
      connection
    );

    if (!conn) {
      await commit(connection);
    }
  } catch (err) {
    error(err);
    if (!conn) {
      await rollback(connection);
    }
    throw err;
  }
}

export function hookBeforeUpdateOrderStatus(
  callback: (
    this: {
      order: OrderRow;
      status: string;
    },
    ...args: [
      orderId: number,
      status: string,
      connection: PoolClient,
      ...args: any[]
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateOrderStatus', callback, priority);
}

export function hookAfterUpdateOrderStatus(
  callback: (
    this: {
      order: OrderRow;
      status: string;
    },
    ...args: [
      orderId: number,
      status: string,
      connection: PoolClient,
      ...args: any[]
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateOrderStatus', callback, priority);
}

export function hookBeforeAddOrderStatusChangeEvents(
  callback: (
    this: {
      order: OrderRow;
      status: string;
    },
    ...args: [
      orderId: number,
      before: string,
      after: string,
      connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('addOrderStatusChangeEvents', callback, priority);
}

export function hookAfterAddOrderStatusChangeEvents(
  callback: (
    this: {
      order: OrderRow;
      status: string;
    },
    ...args: [
      orderId: number,
      before: string,
      after: string,
      connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('addOrderStatusChangeEvents', callback, priority);
}

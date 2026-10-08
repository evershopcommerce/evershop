import {
  commit,
  execute,
  getConnection,
  PoolClient,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { emit } from '../../../lib/event/emitter.js';
import { error } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { hookable, hookBefore, hookAfter } from '../../../lib/util/hookable.js';
import { OrderRow, PaymentTransactionRow } from '../../../types/db/index.js';
import { PaymentStatus } from '../../../types/order.js';
import { getPaymentMethodFactory } from '../../checkout/services/getAvailablePaymentMethods.js';
import addOrderActivityLog from './addOrderActivityLog.js';
import { updatePaymentStatus } from './updatePaymentStatus.js';
import { updateShipmentStatus } from './updateShipmentStatus.js';

/**
 * Order-level cancelability check. The two sides answer different questions
 * with different vocabularies:
 *
 *   - Payment side: `oms.order.paymentStatus[code].isCancelable`. Per-status
 *     boolean. Payment statuses don't have phases or rollups, so the flag
 *     stays per-status here. Defaults: pending/canceled cancelable, paid
 *     not.
 *
 *   - Shipment side: `oms.order.shipmentRollupCancelable[rollupValue]`. The
 *     map is keyed on the ORDER's rollup value (`order.shipment_status`),
 *     NOT a per-shipment status code. Reason: by the time admin clicks
 *     cancel-order, the order may be `partially_shipped` or
 *     `partially_delivered` — rollup-only values that never appear in the
 *     per-shipment status registry. Reading the per-shipment registry
 *     keyed by the rollup value blows up; the rollup-cancelable map is
 *     keyed by the right vocabulary by construction.
 *
 * Returns false if either side says no. Extensions can override via
 * `addProcessor('shipmentRollupCancelable', ...)` (rollup side) or
 * `addProcessor('paymentStatus', ...)` (payment side).
 *
 * Closes the partially-shipped/delivered crash that the per-status registry
 * deref used to throw.
 */
// Exported under a test-suffixed name so the regression test for the
// partially-shipped/delivered crash can hit `validateStatus` directly
// without spinning up a DB-touching `cancelOrder` round-trip.
export function validateStatusForTests(
  paymentStatus: string,
  shipmentStatus: string
) {
  return validateStatus(paymentStatus, shipmentStatus);
}

function validateStatus(paymentStatus: string, shipmentStatus: string) {
  const paymentStatusList = getConfig('oms.order.paymentStatus', {}) as Record<
    string,
    PaymentStatus
  >;
  const paymentStatusConfig = paymentStatusList[paymentStatus];
  if (paymentStatusConfig?.isCancelable === false) {
    return false;
  }

  // Rollup vocabulary — keyed on order.shipment_status (six possible values
  // including the rollup-only partially_shipped / partially_delivered).
  const rollupCancelable = getConfig(
    'oms.order.shipmentRollupCancelable',
    {}
  ) as Record<string, boolean>;
  if (rollupCancelable[shipmentStatus] === false) {
    return false;
  }

  return true;
}

async function updatePaymentStatusToCancel(
  orderID: number,
  connection: PoolClient
) {
  await updatePaymentStatus(orderID, 'canceled', connection);
}

async function updateShipmentStatusToCancel(
  orderID: number,
  connection: PoolClient
) {
  // Multi-shipment world: cancel each non-terminal shipment individually. The
  // rollup short-circuits to `'canceled'` because `order.status` is set to
  // `'canceled'` immediately after this in the same transaction. See
  // wiki/multi-shipment-design.md → Services → cancelOrder integration.
  const { getConfig } = await import('../../../lib/util/getConfig.js');
  const list = getConfig('oms.order.shipmentStatus', {}) as unknown as Record<
    string,
    { phase: string }
  >;
  const cancelableStatuses = Object.entries(list)
    .filter(([, d]) => d.phase !== 'delivered' && d.phase !== 'canceled')
    .map(([code]) => code);
  if (cancelableStatuses.length === 0) return;

  const shipments = await select('uuid')
    .from('shipment')
    .where('shipment_order_id', '=', orderID)
    .and('status', 'IN', cancelableStatuses)
    .execute(connection);
  for (const row of shipments as Array<{ uuid: string }>) {
    await updateShipmentStatus(row.uuid, 'canceled', connection);
  }
}

async function reStockAfterCancel(orderID: number, connection: PoolClient) {
  const orderItems = await select()
    .from('order_item')
    .where('order_item_order_id', '=', orderID)
    .execute(connection, false);

  await Promise.all(
    orderItems.map(async (orderItem) => {
      await execute(
        connection,
        `UPDATE product_inventory SET qty = qty + ${orderItem.qty} WHERE product_inventory_product_id = ${orderItem.product_id}`
      );
    })
  );
}

/**
 * Release an uncaptured authorization at the gateway when a voidable order is
 * canceled. Two gates, both required: the method registered a `void` handler
 * (capability) AND the current payment status is flagged `isVoidable` (state —
 * authorized, not yet captured). Runs inside the cancel transaction so a failed
 * void rolls the whole cancellation back — we never mark an order canceled while
 * its money is still held at the gateway. This is the typed replacement for the
 * per-gateway `hookAfter('changePaymentStatus')` void hooks Stripe and PayPal
 * used to register.
 */
async function maybeVoidAuthorization(order: OrderRow, connection: PoolClient) {
  if (!order.payment_method) {
    return;
  }
  const statuses = getConfig('oms.order.paymentStatus', {}) as Record<
    string,
    PaymentStatus
  >;
  if (!statuses[order.payment_status]?.isVoidable) {
    return;
  }
  const factory = await getPaymentMethodFactory(order.payment_method);
  if (!factory?.void) {
    return;
  }
  const txQuery = select()
    .from('payment_transaction')
    .orderBy('payment_transaction_id', 'DESC');
  txQuery.where('payment_transaction_order_id', '=', order.order_id);
  const txns = (await txQuery.execute(
    connection,
    false
  )) as PaymentTransactionRow[];
  const authorization = txns[0];
  if (!authorization) {
    return;
  }
  await factory.void({ order, transaction: authorization });
}

async function cancelOrder(uuid: string, reason: string | undefined) {
  const connection = await getConnection(pool);
  try {
    await startTransaction(connection);
    const order = await select()
      .from('order')
      .where('uuid', '=', uuid)
      .load(connection, false);
    if (!order) {
      throw new Error('Order not found');
    }

    const statusCheck = hookable(validateStatus, { order })(
      order.payment_status,
      order.shipment_status
    );

    if (!statusCheck) {
      throw new Error('Order is not cancelable at this status');
    }

    // Release an uncaptured authorization at the gateway before marking the
    // order canceled (voidable/authorized orders only).
    await maybeVoidAuthorization(order, connection);

    await hookable(updatePaymentStatusToCancel, { order })(
      order.order_id,
      connection
    );
    await hookable(updateShipmentStatusToCancel, { order })(
      order.order_id,
      connection
    );
    await addOrderActivityLog(
      order.order_id,
      `Order canceled ${reason ? `(${reason})` : ''}`,
      false,
      connection
    );
    await hookable(reStockAfterCancel, { order })(order.order_id, connection);
    // Dedicated cancellation event (carries the reason). Emitted on this
    // connection so it commits atomically with the cancellation and reaches
    // subscribers only after commit.
    await emit(
      'order_canceled',
      { orderId: order.order_id, reason },
      connection
    );
    await commit(connection);
  } catch (err) {
    error(err);
    await rollback(connection);
    throw err;
  }
}

/**
 * Cancels an order by its UUID and adds a cancellation reason.
 * @param uuid - The UUID of the order to cancel.
 * @param reason - The reason for cancellation.
 * @returns A promise that resolves when the order is canceled.
 */
export default async (uuid: string, reason: string | undefined) => {
  await hookable(cancelOrder, { uuid })(uuid, reason);
};

export function hookBeforeValidateStatus(
  callback: (
    this: { order: Record<string, any> },
    ...args: [
    paymentStatus: string,
    shipmentStatus: string
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('validateStatus', callback, priority);
}

export function hookAfterValidateStatus(
  callback: (
    this: { order: Record<string, any> },
    ...args: [
    paymentStatus: string,
    shipmentStatus: string
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('validateStatus', callback, priority);
}

export function hookBeforeUpdatePaymentStatusToCancel(
  callback: (
    this: { order: Record<string, any> },
    ...args: [
    orderID: number,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updatePaymentStatusToCancel', callback, priority);
}

export function hookAfterUpdatePaymentStatusToCancel(
  callback: (
    this: { order: Record<string, any> },
    ...args: [
    orderID: number,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updatePaymentStatusToCancel', callback, priority);
}

export function hookBeforeUpdateShipmentStatusToCancel(
  callback: (
    this: { order: Record<string, any> },
    ...args: [
    orderID: number,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateShipmentStatusToCancel', callback, priority);
}

export function hookAfterUpdateShipmentStatusToCancel(
  callback: (
    this: { order: Record<string, any> },
    ...args: [
    orderID: number,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateShipmentStatusToCancel', callback, priority);
}

export function hookBeforeReStockAfterCancel(
  callback: (
    this: { order: Record<string, any> },
    ...args: [
    orderID: number,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('reStockAfterCancel', callback, priority);
}

export function hookAfterReStockAfterCancel(
  callback: (
    this: { order: Record<string, any> },
    ...args: [
    orderID: number,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('reStockAfterCancel', callback, priority);
}

export function hookBeforeCancelOrder(
  callback: (
    this: { uuid: string },
    ...args: [
    uuid: string,
    reason: string | undefined
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('cancelOrder', callback, priority);
}

export function hookAfterCancelOrder(
  callback: (
    this: { uuid: string },
    ...args: [
    uuid: string,
    reason: string | undefined
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('cancelOrder', callback, priority);
}

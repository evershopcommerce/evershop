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
    const orderStatuses = new Topo.Sorter();
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
  // Reverse the order status list to get the highest priority status first
  const nextStatus =
    finalPsoMapping[`${paymentStatus}:${shipmentStatus}`] ||
    finalPsoMapping[`*:${shipmentStatus}`] ||
    finalPsoMapping[`${paymentStatus}:*`] ||
    finalPsoMapping['*:*'];
  if (!nextStatus || !orderStatusList[nextStatus]) {
    throw new Error(
      'Can not found a valid order status from the current shipment and payment status'
    );
  }
  return nextStatus;
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

  if (order.status === status) {
    return;
  }
  // Do not allow to revert the status
  if (statusFlow.indexOf(order.status) > statusFlow.indexOf(status)) {
    throw new Error('Can not revert the status of the order');
  }

  try {
    if (!conn) {
      await startTransaction(connection);
    }

    await hookable(updateOrderStatus, {
      order,
      status
    })(order.order_id, status, connection);

    await hookable(addOrderStatusChangeEvents, {
      order,
      status
    })(
      order.order_id,
      order.status ? order.status.toString() : 'unknown',
      status,
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

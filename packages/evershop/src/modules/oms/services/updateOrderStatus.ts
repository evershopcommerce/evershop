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
import { hookable } from '../../../lib/util/hookable.js';
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

export function resolveOrderStatus(
  paymentStatus: string,
  shipmentStatus: string
): string {
  const orderStatusList = getConfig('oms.order.status', {});
  const shipmentStatusList = getConfig(
    'oms.order.shipmentStatus',
    {}
  ) as ShipmentStatus[];
  const paymentStatusList = getConfig(
    'oms.order.paymentStatus',
    {}
  ) as PaymentStatus[];
  const psoMapping = getConfig('oms.order.psoMapping', {});
  const shipmentStatusDefination = shipmentStatusList[shipmentStatus];
  const paymentStatusDefination = paymentStatusList[paymentStatus];
  if (!shipmentStatusDefination || !paymentStatusDefination) {
    throw new Error(
      'Either shipment status or payment status is invalid. Can not update order status'
    );
  }
  // Reverse the order status list to get the highest priority status first
  const nextStatus =
    psoMapping[`${paymentStatus}:${shipmentStatus}`] ||
    psoMapping[`*:${shipmentStatus}`] ||
    psoMapping[`${paymentStatus}:*`] ||
    psoMapping['*:*'];
  if (!nextStatus || !orderStatusList[nextStatus]) {
    throw new Error(
      'Can not found a valid order status from the current shipment and payment status'
    );
  }
  return nextStatus;
}

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
        order_id: orderId,
        before,
        after
      }
    })
    .execute(connection);
}

export async function changeOrderStatus(
  orderId: number,
  status: string,
  conn: PoolClient
) {
  const statusFlow = getOrderStatusFlow();
  const order = await select()
    .from('order')
    .where('order_id', '=', orderId)
    .load(conn, false);
  if (!order) {
    throw new Error('Order not found');
  }
  // Do not allow to revert the status
  if (statusFlow.indexOf(order.status) > statusFlow.indexOf(status)) {
    throw new Error('Can not revert the status of the order');
  }
  const connection = conn || (await getConnection(pool));
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
    })(order.order_id, order.status.toString(), status, connection);

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

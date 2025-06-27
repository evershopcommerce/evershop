import {
  commit,
  execute,
  getConnection,
  insert,
  PoolClient,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { error } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { hookable } from '../../../lib/util/hookable.js';
import { PaymentStatus, ShipmentStatus } from '../../../types/order.js';
import { updatePaymentStatus } from './updatePaymentStatus.js';
import { updateShipmentStatus } from './updateShipmentStatus.js';

function validateStatus(paymentStatus: string, shipmentStatus: string) {
  const shipmentStatusList = getConfig(
    'oms.order.shipmentStatus',
    {}
  ) as ShipmentStatus[];
  const paymentStatusList = getConfig(
    'oms.order.paymentStatus',
    {}
  ) as PaymentStatus[];

  const paymentStatusConfig = paymentStatusList[paymentStatus];
  const shipmentStatusConfig = shipmentStatusList[shipmentStatus];
  if (
    paymentStatusConfig.isCancelable === false ||
    shipmentStatusConfig.isCancelable === false
  ) {
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
  await updateShipmentStatus(orderID, 'canceled', connection);
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

async function addCancellationActivity(
  orderID: number,
  reason: string | undefined,
  connection: PoolClient
): Promise<void> {
  await insert('order_activity')
    .given({
      order_activity_order_id: orderID,
      comment: `Order canceled ${reason ? `(${reason})` : ''}`,
      customer_notified: 0 // TODO: check config of SendGrid
    })
    .execute(connection, false);
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

    await hookable(updatePaymentStatusToCancel, { order })(
      order.order_id,
      connection
    );
    await hookable(updateShipmentStatusToCancel, { order })(
      order.order_id,
      connection
    );
    await hookable(addCancellationActivity, { order })(
      order.order_id,
      reason,
      connection
    );
    await hookable(reStockAfterCancel, { order })(order.order_id, connection);
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

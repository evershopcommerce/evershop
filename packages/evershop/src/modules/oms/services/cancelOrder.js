const { error } = require('@evershop/evershop/src/lib/log/logger');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const {
  select,
  insert,
  commit,
  rollback,
  getConnection,
  startTransaction,
  execute
} = require('@evershop/postgres-query-builder');
const { updatePaymentStatus } = require('./updatePaymentStatus');
const { updateShipmentStatus } = require('./updateShipmentStatus');

function validateStatus(paymentStatus, shipmentStatus) {
  const shipmentStatusList = getConfig('oms.order.shipmentStatus', {});
  const paymentStatusList = getConfig('oms.order.paymentStatus', {});

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

async function updatePaymentStatusToCancel(orderID, connection) {
  await updatePaymentStatus(orderID, 'canceled', connection);
}

async function updateShipmentStatusToCancel(orderID, connection) {
  await updateShipmentStatus(orderID, 'canceled', connection);
}

async function reStockAfterCancel(orderID, connection) {
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

async function addCancellationActivity(orderID, reason, connection) {
  await insert('order_activity')
    .given({
      order_activity_order_id: orderID,
      comment: `Order canceled ${reason ? `(${reason})` : ''}`,
      customer_notified: 0 // TODO: check config of SendGrid
    })
    .execute(connection, false);
}

async function cancelOrder(uuid, reason) {
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

module.exports.cancelOrder = async (uuid, reason) => {
  await hookable(cancelOrder, { uuid })(uuid, reason);
};

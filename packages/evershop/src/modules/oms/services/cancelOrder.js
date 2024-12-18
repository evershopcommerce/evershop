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
  update,
  startTransaction
} = require('@evershop/postgres-query-builder');

function validateStatus(paymentStatus, shipmentStatus) {
  const shipmentStatusList = getConfig('oms.order.shipmentStatus', {});
  const paymentStatusList = getConfig('oms.order.paymentStatus', {});

  const paymentStatusConfig = paymentStatusList[paymentStatus];
  const shipmentStatusConfig = shipmentStatusList[shipmentStatus];
  if (!paymentStatusConfig || !shipmentStatusConfig) {
    return true; // If status is not found, we don't consider it is cancelable
  }
  if (
    paymentStatusConfig.isCancelable === false ||
    shipmentStatusConfig.isCancelable === false
  ) {
    return false;
  }
  return true;
}

async function updateStatusToCancel(uuid, connection) {
  await update('order')
    .given({
      payment_status: 'canceled',
      shipment_status: 'canceled'
    })
    .where('uuid', '=', uuid)
    .execute(connection, false);
}

async function addCancellationActivity(orderID, connection) {
  await insert('order_activity')
    .given({
      order_activity_order_id: orderID,
      comment: 'Order canceled',
      customer_notified: 0 // TODO: check config of SendGrid
    })
    .execute(connection, false);
}

async function cancelOrder(uuid) {
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

    await hookable(updateStatusToCancel, { order })(uuid, connection);
    await hookable(addCancellationActivity, { order })(
      order.order_id,
      connection
    );
    await commit(connection);
  } catch (err) {
    error(err);
    await rollback(connection);
    throw err;
  }
}

module.exports.cancelOrder = async (uuid) => {
  await hookable(cancelOrder, { uuid })(uuid);
};

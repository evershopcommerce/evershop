/**
 * This function will be executed automatically after either shipment status or payment status is updated.
 */
const Topo = require('@hapi/topo');
const { error } = require('@evershop/evershop/src/lib/log/logger');
const {
  getConnection,
  startTransaction,
  commit,
  rollback,
  update
} = require('@evershop/postgres-query-builder');
const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

function resolveOrderStatus(shipmentStatus, paymentStatus) {
  const shipmentStatusList = getConfig('oms.order.shipmentStatus', {});
  const paymentStatusList = getConfig('oms.order.paymentStatus', {});
  const orderStatusList = getConfig('oms.order.status', {});
  const shipmentStatusDefination = shipmentStatusList[shipmentStatus];
  const paymentStatusDefination = paymentStatusList[paymentStatus];
  if (!shipmentStatusDefination || !paymentStatusDefination) {
    throw new Error(
      'Either shipment status or payment status is invalid. Can not update order status'
    );
  }

  const orderStatuses = new Topo.Sorter();
  Object.keys(orderStatusList).forEach((status) => {
    orderStatuses.add(status, {
      before: orderStatusList[status].next
    });
  });

  // Reverse the order status list to get the highest priority status first
  const orderStatusesSorted = orderStatuses.nodes.reverse();
  const nextStatus = orderStatusesSorted.find(
    (status) =>
      shipmentStatusDefination.orderStatus.includes(status) &&
      paymentStatusDefination.orderStatus.includes(status)
  );
  return nextStatus;
}

async function updateOrderStatus(orderId, status, connection) {
  await update('order')
    .given({
      status
    })
    .where('order_id', '=', orderId)
    .execute(connection);
}

module.exports = {
  changeOrderStatus: async (orderId, status, conn) => {
    const connection = conn || (await getConnection(pool));
    try {
      if (!conn) {
        await startTransaction(connection);
      }

      await hookable(updateOrderStatus, {
        orderId,
        status
      })(orderId, status, connection);
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
  },
  resolveOrderStatus
};

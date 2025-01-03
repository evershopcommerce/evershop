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
  update,
  insert
} = require('@evershop/postgres-query-builder');
const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

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

function resolveOrderStatus(paymentStatus, shipmentStatus) {
  const orderStatusList = getConfig('oms.order.status', {});
  const shipmentStatusList = getConfig('oms.order.shipmentStatus', {});
  const paymentStatusList = getConfig('oms.order.paymentStatus', {});
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

async function updateOrderStatus(orderId, status, connection) {
  await update('order')
    .given({
      status
    })
    .where('order_id', '=', orderId)
    .execute(connection);
}

async function addOrderStatusChangeEvents(orderId, before, after, connection) {
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

module.exports = {
  resolveOrderStatus,
  /**
   * This function should not be called directly. Any status change should be done through the payment or shipment status update.
   * @param {Object} order
   * @param {String} status
   * @param {Connection} conn
   */
  changeOrderStatus: async (order, status, conn) => {
    const statusFlow = getOrderStatusFlow();
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
      })(order.order_id, order.status, status, connection);

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
};

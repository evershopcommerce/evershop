import {
  commit,
  getConnection,
  rollback,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { error } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { hookable } from '../../../lib/util/hookable.js';

function validateShipmentStatusBeforeUpdate(status) {
  const shipmentStatusList = getConfig('oms.order.shipmentStatus', {});
  if (!shipmentStatusList[status]) {
    throw new Error('Invalid status');
  }
  return false;
}

async function changeShipmentStatus(orderId, status, connection) {
  const order = await update('order')
    .given({
      shipment_status: status
    })
    .where('order_id', '=', orderId)
    .execute(connection);
  return order;
}

export const updateShipmentStatus = async (orderId, status, conn) => {
  const connection = conn || (await getConnection(pool));
  try {
    if (!conn) {
      await startTransaction(connection);
    }
    hookable(validateShipmentStatusBeforeUpdate, { orderId })(status);
    await hookable(changeShipmentStatus, {
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
};

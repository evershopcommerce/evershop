import {
  commit,
  getConnection,
  PoolClient,
  rollback,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { error } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { hookable } from '../../../lib/util/hookable.js';
import { ShipmentStatus } from '../../../types/order.js';

function validateShipmentStatusBeforeUpdate(status: string): boolean {
  const shipmentStatusList = getConfig(
    'oms.order.shipmentStatus',
    {}
  ) as ShipmentStatus;
  if (!shipmentStatusList[status]) {
    throw new Error('Invalid status');
  }
  return false;
}

async function changeShipmentStatus(
  orderId: number,
  status: string,
  connection: PoolClient
) {
  const order = await update('order')
    .given({
      shipment_status: status
    })
    .where('order_id', '=', orderId)
    .execute(connection);
  return order;
}

export const updateShipmentStatus = async (
  orderId: number,
  status: string,
  conn: PoolClient
): Promise<void> => {
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

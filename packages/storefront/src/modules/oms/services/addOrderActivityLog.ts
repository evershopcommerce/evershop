import { insert, PoolClient } from '@storefront/postgres-query-builder';
import { hookable } from '../../../lib/util/hookable.js';

async function addOrderActivityLog(
  orderId: number,
  message: string,
  notifyCustomer: boolean,
  connection: PoolClient
) {
  /* Add an activity log message */
  const log = await insert('order_activity')
    .given({
      order_activity_order_id: orderId,
      comment: message,
      customer_notified: notifyCustomer ? 1 : 0
    })
    .execute(connection);
  return log;
}

export default async (
  orderId: number,
  message: string,
  notifyCustomer: boolean,
  connection: PoolClient
) => {
  return await hookable(addOrderActivityLog, {
    orderId,
    message,
    notifyCustomer
  })(orderId, message, notifyCustomer, connection);
};

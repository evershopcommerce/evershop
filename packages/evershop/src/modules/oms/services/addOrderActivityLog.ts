import { insert, PoolClient } from '@evershop/postgres-query-builder';
import { hookable, hookBefore, hookAfter } from '../../../lib/util/hookable.js';

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

export function hookBeforeAddOrderActivityLog(
  callback: (
    this: { orderId: number; message: string; notifyCustomer: boolean },
    ...args: [
    orderId: number,
    message: string,
    notifyCustomer: boolean,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('addOrderActivityLog', callback, priority);
}

export function hookAfterAddOrderActivityLog(
  callback: (
    this: { orderId: number; message: string; notifyCustomer: boolean },
    ...args: [
    orderId: number,
    message: string,
    notifyCustomer: boolean,
    connection: PoolClient
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('addOrderActivityLog', callback, priority);
}

import {
  commit,
  PoolClient,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../lib/util/hookable.js';
import {
  hashPassword,
  verifyPassword
} from '../../../../lib/util/passwordHelper.js';
import type { CustomerRow } from '../../../../types/db/index.js';

async function updateCustomerPassword(
  customerId: number,
  hash: string,
  connection: PoolClient
): Promise<void> {
  await update('customer')
    .given({
      password: hash
    })
    .where('customer_id', '=', customerId)
    .execute(connection);
}

/**
 * Update customer password service.
 * @param {Number} customerId
 * @param {String} newPassword
 * @param {Object} context
 */
async function updatePassword(
  customerId: number,
  newPassword: string,
  context: Record<string, unknown>
): Promise<CustomerRow> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('customer');
    const customer = await query
      .where('customer_id', '=', customerId)
      .load(connection);
    if (!customer) {
      throw new Error('Requested customer not found');
    }
    // Verify password
    verifyPassword(newPassword);
    // Hash password
    const hash = hashPassword(newPassword);
    // Update customer password
    await hookable(updateCustomerPassword, {
      ...context,
      connection
    })(customerId, hash, connection);

    await commit(connection);
    return customer;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Update customer password service.
 * @param {Number} customerId
 * @param {String} password
 * @param {Object} context
 */
export default async (
  customerId: number,
  password: string,
  context: Record<string, unknown>
): Promise<boolean> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  await hookable(updatePassword, context)(customerId, password, context);
  return true;
};

export function hookBeforeUpdateCustomerPassword(
  callback: (
    this: Record<string, unknown>,
    ...args: [customerId: number, hash: string, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateCustomerPassword', callback, priority);
}

export function hookAfterUpdateCustomerPassword(
  callback: (
    this: Record<string, unknown>,
    ...args: [customerId: number, hash: string, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateCustomerPassword', callback, priority);
}

export function hookBeforeUpdatePassword(
  callback: (
    this: Record<string, unknown>,
    ...args: [
      customerId: number,
      newPassword: string,
      context: Record<string, unknown>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updatePassword', callback, priority);
}

export function hookAfterUpdatePassword(
  callback: (
    this: Record<string, unknown>,
    ...args: [
      customerId: number,
      newPassword: string,
      context: Record<string, unknown>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updatePassword', callback, priority);
}

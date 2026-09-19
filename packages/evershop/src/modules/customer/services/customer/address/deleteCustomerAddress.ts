import {
  commit,
  del,
  PoolClient,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../../lib/util/hookable.js';
import { Address } from '../../../../../types/customerAddress.js';

async function deleteCustomerAddressData(
  uuid: string,
  connection: PoolClient
): Promise<void> {
  await del('customer_address').where('uuid', '=', uuid).execute(connection);
}
/**
 * Delete customer address service. This service will delete a customer address with all related data
 * @param {String} uuid
 * @param {Object} context
 * @return {Promise<Address>} The deleted address
 * @throws {Error} If the address does not exist or if there is an error during the transaction
 */
async function deleteCustomerAddress(
  uuid: string,
  context: Record<string, unknown>
): Promise<Address> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('customer_address');
    const address = await query.where('uuid', '=', uuid).load(connection);

    if (!address) {
      throw new Error('Invalid address id');
    }
    await hookable(deleteCustomerAddressData, {
      ...context,
      connection,
      address
    })(uuid, connection);

    await commit(connection);
    return address;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Delete customer address service. This service will delete a customer address with all related data
 * @param {String} uuid
 * @param {Object} context
 * @return {Promise<Address>} The deleted address
 * @throws {Error} If the address does not exist or if there is an error during the transaction
 */
export default async (
  uuid: string,
  context: Record<string, unknown>
): Promise<Address> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const customerAddress = await hookable(deleteCustomerAddress, context)(
    uuid,
    context
  );
  return customerAddress;
};

export function hookBeforeDeleteCustomerAddressData(
  callback: (
    this: Record<string, unknown>,
    ...args: [uuid: string, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('deleteCustomerAddressData', callback, priority);
}

export function hookAfterDeleteCustomerAddressData(
  callback: (
    this: Record<string, unknown>,
    ...args: [uuid: string, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('deleteCustomerAddressData', callback, priority);
}

export function hookBeforeDeleteCustomerAddress(
  callback: (
    this: Record<string, unknown>,
    ...args: [uuid: string, context: Record<string, unknown>]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('deleteCustomerAddress', callback, priority);
}

export function hookAfterDeleteCustomerAddress(
  callback: (
    this: Record<string, unknown>,
    ...args: [uuid: string, context: Record<string, unknown>]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('deleteCustomerAddress', callback, priority);
}

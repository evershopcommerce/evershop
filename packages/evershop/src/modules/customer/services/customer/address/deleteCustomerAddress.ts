import {
  commit,
  del,
  PoolClient,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../../lib/postgres/connection.js';
import { hookable } from '../../../../../lib/util/hookable.js';
import { Address } from './addressValidators.js';

async function deleteCustomerAddressData(uuid: string, connection: PoolClient) {
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

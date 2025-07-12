import {
  commit,
  insert,
  PoolClient,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection, pool } from '../../../../../lib/postgres/connection.js';
import { hookable } from '../../../../../lib/util/hookable.js';
import { getValue } from '../../../../../lib/util/registry.js';
import { Address, validateAddress } from './addressValidators.js';

async function insertCustomerAddressData(
  data: Address,
  connection: PoolClient
): Promise<Address> {
  const address = await insert('customer_address')
    .given(data)
    .execute(connection);
  if (address.is_default) {
    await update('customer_address')
      .given({
        is_default: 0
      })
      .where('customer_id', '=', address.customer_id)
      .and('uuid', '<>', address.uuid)
      .execute(connection);
  }
  return address;
}

/**
 * Create customer address service. This service will create a customer address with all related data
 * @param {String} customerUUID
 * @param {Address} address
 * @param {Object} context
 */
async function createCustomerAddress(
  customerUUID: string,
  address: Address,
  context: Record<string, unknown>
): Promise<Address> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const customerAddressData = await getValue(
      'customerAddressDataBeforeCreate',
      address,
      context
    );
    // Validate customer address data
    const validationResults = validateAddress(customerAddressData);
    if (!validationResults.valid) {
      throw new Error(`${validationResults.errors.join(', ')}`);
    }
    const customer = await select()
      .from('customer')
      .where('uuid', '=', customerUUID)
      .load(pool);

    if (!customer) {
      throw new Error('Invalid customer');
    }
    customerAddressData.customer_id = customer.customer_id;
    // Insert customer address data
    const customerAddress = await hookable(insertCustomerAddressData, {
      ...context,
      connection
    })(customerAddressData, connection);

    await commit(connection);
    return customerAddress;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Create customer address service. This service will create a customer address with all related data
 * @param {String} customerUUID
 * @param {Address} addressData
 * @param {Object} context
 * @returns {Promise<Address>}
 * @throws {Error} If context is not an object or if address validation fails
 */
export default async (
  customerUUID: string,
  addressData: Address,
  context: Record<string, unknown>
) => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const address = await hookable(createCustomerAddress, context)(
    customerUUID,
    addressData,
    context
  );
  return address;
};

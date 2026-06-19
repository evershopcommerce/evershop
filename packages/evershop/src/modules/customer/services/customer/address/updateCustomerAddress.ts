import {
  commit,
  PoolClient,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../../lib/util/hookable.js';
import { getValue } from '../../../../../lib/util/registry.js';
import { Address } from '../../../../../types/customerAddress.js';
import { validateAddress } from './addressValidators.js';

async function updateCustomerAddressData(
  uuid: string,
  data: Partial<Address>,
  connection: PoolClient
): Promise<Address> {
  const query = select().from('customer_address');
  const address = await query.where('uuid', '=', uuid).load(connection);
  try {
    const newAddress = (await update('customer_address')
      .given(data)
      .where('uuid', '=', uuid)
      .execute(connection)) as unknown as Address;
    if (newAddress.is_default) {
      await update('customer_address')
        .given({
          is_default: 0
        })
        .where('customer_id', '=', newAddress.customer_id)
        .and('uuid', '<>', newAddress.uuid)
        .execute(connection);
    }
    Object.assign(address, newAddress);
  } catch (e) {
    if (!e.message.includes('No data was provided')) {
      throw e;
    }
  }
  return address;
}

/**
 * Update customer address service. This service will update a customer address with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 * @return {Promise<Address>} The updated address
 * @throws {Error} If the address does not exist or if there is an error during the transaction
 * @throws {Error} If the address data is invalid
 */
async function updateCustomerAddress(
  uuid: string,
  data: Partial<Address>,
  context: Record<string, unknown>
): Promise<Address> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const addressData = await getValue('customerDataBeforeUpdate', data);
    const query = select().from('customer_address');
    const currentAddress = await query
      .where('uuid', '=', uuid)
      .load(connection);
    if (!currentAddress) {
      throw new Error('Requested address not found');
    }
    // Remove null values from the current address
    Object.keys(currentAddress).forEach((key) => {
      if (currentAddress[key] === null) {
        delete currentAddress[key];
      }
    });
    // Validate address data
    const validationResults = validateAddress({
      ...currentAddress,
      ...addressData
    });
    if (!validationResults.valid) {
      throw new Error(`${validationResults.errors.join(', ')}`);
    }
    // Update address data
    const address = await hookable(updateCustomerAddressData, {
      ...context,
      connection
    })(uuid, addressData, connection);

    await commit(connection);
    return address;
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

/**
 * Update customer address service. This service will update a customer address with all related data
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 * @return {Promise<Address>} The updated address
 * @throws {Error} If the address does not exist or if there is an error during the transaction
 * @throws {Error} If the context is not an object
 */
export default async (
  uuid: string,
  data: Partial<Address>,
  context: Record<string, unknown>
): Promise<Address> => {
  // Make sure the context is either not provided or is an object
  if (context && typeof context !== 'object') {
    throw new Error('Context must be an object');
  }
  const address = await hookable(updateCustomerAddress, context)(
    uuid,
    data,
    context
  );
  return address;
};

export function hookBeforeUpdateCustomerAddressData(
  callback: (
    this: Record<string, unknown>,
    ...args: [uuid: string, data: Partial<Address>, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateCustomerAddressData', callback, priority);
}

export function hookAfterUpdateCustomerAddressData(
  callback: (
    this: Record<string, unknown>,
    ...args: [uuid: string, data: Partial<Address>, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateCustomerAddressData', callback, priority);
}

export function hookBeforeUpdateCustomerAddress(
  callback: (
    this: Record<string, unknown>,
    ...args: [
      uuid: string,
      data: Partial<Address>,
      context: Record<string, unknown>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('updateCustomerAddress', callback, priority);
}

export function hookAfterUpdateCustomerAddress(
  callback: (
    this: Record<string, unknown>,
    ...args: [
      uuid: string,
      data: Partial<Address>,
      context: Record<string, unknown>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('updateCustomerAddress', callback, priority);
}

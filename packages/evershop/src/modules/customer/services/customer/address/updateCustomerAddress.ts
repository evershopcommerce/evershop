import {
  commit,
  PoolClient,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { validateAddress } from '../../../../../lib/address/validate.js';
import { getConnection } from '../../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../../lib/util/hookable.js';
import { getValue } from '../../../../../lib/util/registry.js';
import type { Address } from '../../../../../types/address.js';
import { AddressValidationError } from './AddressValidationError.js';
import { foldAddressExtras } from './foldAddressExtras.js';

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
 * Update customer address service (spec § 3.8, § 3.12). The stored row is
 * loaded first and handed to the normalization seam as `previous`; the
 * merged row is validated with `previous` (split-name rule), while unknown
 * keys can only come from the payload (D-10); `extra` merges key by key
 * (D-11); only the payload's columns reach `update().given()`.
 * @param {String} uuid
 * @param {Object} data
 * @param {Object} context
 * @return {Promise<Address>} The updated address
 * @throws {Error} If the address does not exist or if there is an error during the transaction
 * @throws {AddressValidationError} If the address data is invalid
 */
async function updateCustomerAddress(
  uuid: string,
  data: Partial<Address>,
  context: Record<string, unknown>
): Promise<Address> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const query = select().from('customer_address');
    const currentAddress = (await query
      .where('uuid', '=', uuid)
      .load(connection)) as Address | null;
    if (!currentAddress) {
      throw new Error('Requested address not found');
    }
    // D2: this seam used to reuse the customer registry key
    // `customerDataBeforeUpdate`, so processors written for customer updates
    // silently received address objects. It now has its own typed key.
    const addressData = await getValue('customerAddressDataBeforeUpdate', data, {
      ...context,
      previous: currentAddress
    });
    const validation = await validateAddress(
      { ...currentAddress, ...addressData },
      { surface: 'account', previous: currentAddress }
    );
    if (!validation.valid) {
      throw new AddressValidationError(validation.errors);
    }
    const row = foldAddressExtras(addressData, currentAddress);
    // Update address data
    const address = await hookable(updateCustomerAddressData, {
      ...context,
      connection,
      previous: currentAddress
    })(uuid, row, connection);

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

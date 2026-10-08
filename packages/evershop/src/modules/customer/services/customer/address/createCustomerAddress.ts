import {
  commit,
  insert,
  PoolClient,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { validateAddress } from '../../../../../lib/address/validate.js';
import { getConnection, pool } from '../../../../../lib/postgres/connection.js';
import {
  hookable,
  hookBefore,
  hookAfter
} from '../../../../../lib/util/hookable.js';
import { getValue } from '../../../../../lib/util/registry.js';
import type { Address } from '../../../../../types/address.js';
import { AddressValidationError } from './AddressValidationError.js';
import { foldAddressExtras } from './foldAddressExtras.js';

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
 * Create customer address service (spec § 3.8). Order of operations:
 * normalization seam (`customerAddressDataBeforeCreate` processors) →
 * `validateAddress` against the country's schema, which rejects unknown keys →
 * registered extras folded into `extra` → `insert().given()`.
 * @param {String} customerUUID
 * @param {Address} address
 * @param {Object} context
 * @throws {AddressValidationError} with the field-targeted `errors[]`
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
    const validation = await validateAddress(customerAddressData, {
      surface: 'account'
    });
    if (!validation.valid) {
      throw new AddressValidationError(validation.errors);
    }
    const customer = await select()
      .from('customer')
      .where('uuid', '=', customerUUID)
      .load(pool);

    if (!customer) {
      throw new Error('Invalid customer');
    }
    const row = foldAddressExtras(customerAddressData);
    row.customer_id = customer.customer_id;
    // Insert customer address data
    const customerAddress = await hookable(insertCustomerAddressData, {
      ...context,
      connection
    })(row, connection);

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
): Promise<Address> => {
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

export function hookBeforeInsertCustomerAddressData(
  callback: (
    this: Record<string, unknown>,
    ...args: [data: Address, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('insertCustomerAddressData', callback, priority);
}

export function hookAfterInsertCustomerAddressData(
  callback: (
    this: Record<string, unknown>,
    ...args: [data: Address, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('insertCustomerAddressData', callback, priority);
}

export function hookBeforeCreateCustomerAddress(
  callback: (
    this: Record<string, unknown>,
    ...args: [
      customerUUID: string,
      address: Address,
      context: Record<string, unknown>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('createCustomerAddress', callback, priority);
}

export function hookAfterCreateCustomerAddress(
  callback: (
    this: Record<string, unknown>,
    ...args: [
      customerUUID: string,
      address: Address,
      context: Record<string, unknown>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('createCustomerAddress', callback, priority);
}

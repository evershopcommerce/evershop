import {
  insert,
  select,
  update,
  getConnection,
  startTransaction,
  commit,
  rollback,
  PoolClient
} from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { hookable, hookBefore, hookAfter } from '../../../lib/util/hookable.js';
import { Address } from '../../../types/customerAddress.js';
import { validateAddress } from '../../customer/services/customer/address/addressValidators.js';

interface ShippingAddress extends Address {
  /**
   * The ID of the shipping address
   */
  cart_address_id: number;
}
/**
 * Add shipping address to cart service.
 * This service validates the address, checks shipping zones, and saves the address to the cart.
 *
 * @param {string} cartUUID - The UUID of the cart to add the shipping address to
 * @param {Address} addressData - The shipping address data to be saved
 * @param {Record<string, unknown>} context - Additional context for hooks and extensions
 * @throws {Error} If cart does not exist, address validation fails, or shipping zone is not available
 * @returns {Promise<Address>} The newly created address object
 */
const _addShippingAddress = async function addShippingAddress<
  T extends Address = Address,
  R = ShippingAddress
>(
  cartUUID: string,
  addressData: T,
  context: Record<string, unknown> = {}
): Promise<R> {
  if (!cartUUID || typeof cartUUID !== 'string') {
    throw new Error('Cart UUID is required');
  }

  if (!addressData || typeof addressData !== 'object') {
    throw new Error('Address data is required');
  }

  if (typeof context !== 'object' || context === null) {
    throw new Error('Context must be an object');
  }

  // Get database connection for transaction
  const connection = await getConnection(pool);

  try {
    await startTransaction(connection);

    // Verify cart exists and is active
    const cart = await select()
      .from('cart')
      .where('uuid', '=', cartUUID)
      .andWhere('status', '=', true)
      .load(connection);

    if (!cart) {
      throw new Error('Cart not found or not active');
    }

    // Validate address
    const validationResult = validateAddress(addressData);

    if (!validationResult.valid) {
      const errorMessage =
        validationResult.errors?.[0] || 'Invalid address data';
      throw new Error(errorMessage);
    }

    // Zone resolution moved into the provider abstraction. The cart's
    // shipping_method_data field resolver calls resolveZonesForAddress when
    // it needs to validate the customer's selection. The address-add flow no
    // longer needs to pre-resolve a zone here.
    //
    // See wiki/shipping-provider-design.md → "Data flow".

    // Save address to database
    const savedAddress = await hookable(saveShippingAddress, {
      cartUUID,
      addressData,
      cart,
      ...context
    })(addressData, connection);

    // Update cart with shipping address.
    await hookable(updateCartWithShippingAddress, {
      cartUUID,
      addressData,
      cart,
      savedAddress,
      ...context
    })(cart.cart_id, savedAddress.cart_address_id, connection);

    await commit(connection);

    return savedAddress;
  } catch (error) {
    await rollback(connection);
    throw error;
  }
};

/**
 * Save shipping address to database
 */
async function saveShippingAddress(
  addressData: Address,
  connection: PoolClient
) {
  // Save address to database
  const result = await insert('cart_address')
    .given(addressData)
    .execute(connection);

  // Get the saved address
  const savedAddress = await select()
    .from('cart_address')
    .where('cart_address_id', '=', result.insertId)
    .load(connection);

  return savedAddress;
}

/**
 * Update cart with shipping zone and address
 */
async function updateCartWithShippingAddress(
  cartId: number,
  addressId: number,
  connection: PoolClient
) {
  await update('cart')
    .given({
      shipping_address_id: addressId
    })
    .where('cart_id', '=', cartId)
    .execute(connection);
}

/**
 * Hookable wrapper for the addShippingAddress service.
 * This allows third-party extensions to hook into the shipping address addition flow.
 */
export const addShippingAddress = async (
  cartUUID: string,
  addressData: Address,
  context: Record<string, unknown> = {}
) => {
  const result = await hookable(_addShippingAddress, {
    cartUUID,
    addressData,
    ...context
  })(cartUUID, addressData, context);
  return result;
};

export function hookBeforeSaveShippingAddress(
  callback: (
    this: Record<string, unknown>,
    ...args: [addressData: Address, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('saveShippingAddress', callback, priority);
}

export function hookAfterSaveShippingAddress(
  callback: (
    this: Record<string, unknown>,
    ...args: [addressData: Address, connection: PoolClient]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('saveShippingAddress', callback, priority);
}

export function hookBeforeAddShippingAddress(
  callback: (
    this: Record<string, unknown>,
    ...args: [
      cartUUID: string,
      addressData: Address,
      context: Record<string, unknown>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('addShippingAddress', callback, priority);
}

export function hookAfterAddShippingAddress(
  callback: (
    this: Record<string, unknown>,
    ...args: [
      cartUUID: string,
      addressData: Address,
      context: Record<string, unknown>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('addShippingAddress', callback, priority);
}

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
import { hookable } from '../../../lib/util/hookable.js';
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
async function addShippingAddressService<
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

    // // Find shipping zone for the address
    // const shippingZone = await hookable(findShippingZone, {
    //   cartUUID,
    //   addressData,
    //   cart,
    //   ...context
    // })(addressData, connection);

    // if (!shippingZone) {
    //   throw new Error('We do not ship to this address');
    // }

    // Save address to database
    const savedAddress = await hookable(saveShippingAddress, {
      cartUUID,
      addressData,
      cart,
      //shippingZone,
      ...context
    })(addressData, connection);

    // Update cart with shipping zone and address
    await hookable(updateCartWithAddress, {
      cartUUID,
      addressData,
      cart,
      //shippingZone,
      savedAddress,
      ...context
    })(cart.cart_id, savedAddress.cart_address_id, connection);

    await commit(connection);

    return savedAddress;
  } catch (error) {
    await rollback(connection);
    throw error;
  }
}

/**
 * Find shipping zone for the given address
 */
async function findShippingZone(addressData: Address, connection: PoolClient) {
  const shippingZoneQuery = select().from('shipping_zone');
  shippingZoneQuery
    .leftJoin('shipping_zone_province')
    .on(
      'shipping_zone_province.zone_id',
      '=',
      'shipping_zone.shipping_zone_id'
    );
  shippingZoneQuery.where('shipping_zone.country', '=', addressData.country);

  const shippingZoneProvinces = await shippingZoneQuery.execute(connection);
  const shippingZone = shippingZoneProvinces.find(
    (zone) => zone.province === addressData.province || zone.province === null
  );

  return shippingZone;
}

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
async function updateCartWithAddress(
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
  const result = await hookable(addShippingAddressService, {
    cartUUID,
    addressData,
    ...context
  })(cartUUID, addressData, context);
  return result;
};

import { select, update } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { Cart, getCart } from './cart/Cart.js';
import { belongsToAnotherCustomer, releaseCartFromSession } from './cartSession.js';

/**
 * This function return a Cart object by the session ID.
 * @param {string} sid - The session ID
 * @param {number} customerId - The customer ID
 * @returns {Promise<Cart | null>} - The Cart object if found, otherwise null
 * @throws {Error} If there is an error during the query
 * @description This function retrieves the current cart associated with a session ID.
 */
export const getMyCart = async (
  sid: string,
  customerId?: number
): Promise<Cart | null> => {
  // Try to get the cart by the session id first
  const cartBySid = await select()
    .from('cart')
    .where('status', '=', 1)
    .andWhere('sid', '=', sid)
    .load(pool);

  if (cartBySid) {
    if (!belongsToAnotherCustomer(cartBySid, customerId)) {
      const cart = await getCart(cartBySid.uuid);
      return cart;
    }
    // The session's cart is another customer's: they signed out on this
    // browser and someone else is here now. Never hand it over — it carries
    // their items and their address. Unlink it from the session instead; it
    // stays theirs and comes back at their next sign-in (below).
    await releaseCartFromSession(cartBySid.cart_id);
  }

  // Get the customer id from the session
  if (customerId) {
    // Check if any cart is associated with the customer id
    const abandonedCart = await select()
      .from('cart')
      .where('customer_id', '=', customerId)
      .andWhere('status', '=', 1)
      .load(pool);

    if (abandonedCart) {
      // Update the cart with the session id
      await update('cart')
        .given({ sid: sid })
        .where('uuid', '=', abandonedCart.uuid)
        .execute(pool);
      const cart = await getCart(abandonedCart.uuid);
      return cart;
    }
  }
  return null;
};

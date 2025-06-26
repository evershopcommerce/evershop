import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { Cart, getCart } from './cart/Cart.js';

/**
 * This function return a Cart object by the session ID.
 * @param {string} sid - The session ID
 * @returns {Promise<Cart | null>} - The Cart object if found, otherwise null
 * @throws {Error} If there is an error during the query
 * @description This function retrieves the current cart associated with a session ID.
 */
export const getCurrentCart = async (sid: string): Promise<Cart | null> => {
  // Try to get the cart by the session id first
  const cartBySid = await select()
    .from('cart')
    .where('status', '=', 1)
    .andWhere('sid', '=', sid)
    .load(pool);

  if (cartBySid) {
    const cart = await getCart(cartBySid.uuid);
    return cart;
  } else {
    return null;
  }
};

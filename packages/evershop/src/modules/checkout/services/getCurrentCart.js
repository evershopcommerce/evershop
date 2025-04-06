/* eslint-disable camelcase */
import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/src/lib/postgres/connection.js';
import { getCart } from './cart/Cart.js';

/**
 * This function return a Cart object by the session ID.
 * @param {string} sid : The session ID
 * @returns {Promise<Cart>}
 */
export const getCurrentCart = async (sid) => {
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

import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { getCart } from './cart/Cart.js';

/**
 * This function returns a Cart object by ID.
 * It only return
 * @param {*} id
 * @returns {Promise<Cart || null> }
 */
export const getCartById = async (id) => {
  const query = select().from('cart');
  query.where('cart_id', '=', id);
  const data = await query.load(pool);
  if (!data) {
    throw new Error('Cart not found');
  } else {
    const cart = await getCart(cart.uuid);
    return cart;
  }
};

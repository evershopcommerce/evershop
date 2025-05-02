import { getCart } from '../../../modules/checkout/services/cart/Cart.js';

/**
 * This function returns a Cart object by ID.
 * @param {*} id
 * @returns {Promise<Cart>}
 */
export const getCartByUUID = async (uuid) => {
  const cart = await getCart(uuid);
  return cart;
};

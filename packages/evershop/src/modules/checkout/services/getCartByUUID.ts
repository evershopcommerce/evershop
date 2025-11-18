import { Cart, getCart } from '../../../modules/checkout/services/cart/Cart.js';

/**
 * This function returns a Cart object by ID.
 * @param {*} uuid - The UUID of the cart to retrieve
 * @throws {Error} If the cart does not exist or if there is an error during the transaction
 * @returns {Promise<Cart>}
 */
export const getCartByUUID = async (uuid: string): Promise<Cart> => {
  const cart = await getCart(uuid);
  return cart;
};

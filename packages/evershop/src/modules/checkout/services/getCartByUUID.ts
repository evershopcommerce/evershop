import {
  Cart,
  CartNotFoundError,
  getCart
} from '../../../modules/checkout/services/cart/Cart.js';

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

/**
 * The active cart with this id, or null when there is none: an unknown id,
 * an id that is not a UUID, or a cart whose order was placed. For the
 * `/carts/:cart_id/*` routes, which answer 404 then; `getCartByUUID` throws
 * instead, so their `if (!cart)` branches never ran and the throw became a
 * 500. Any other error (the database is down) still throws.
 */
export const findCartByUUID = async (uuid: string): Promise<Cart | null> => {
  try {
    return await getCart(uuid);
  } catch (e) {
    if (e instanceof CartNotFoundError) {
      return null;
    }
    throw e;
  }
};

export { CartNotFoundError };

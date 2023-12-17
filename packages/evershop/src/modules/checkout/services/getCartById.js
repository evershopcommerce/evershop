const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { getCart } = require('./cart/Cart');

module.exports = exports;

/**
 * This function returns a Cart object by ID.
 * It only return
 * @param {*} id
 * @returns {Promise<Cart || null> }
 */
exports.getCartById = async (id) => {
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

const { select } = require('@evershop/postgres-query-builder');
const { pool } = require('@evershop/evershop/src/lib/postgres/connection');
const { Cart } = require('./cart/Cart');

module.exports = exports;

/**
 * This function returns a Cart object by ID.
 * @param {*} id
 * @returns {Promise<Cart>}
 */
exports.getCartByUUID = async (uuid) => {
  const query = select().from('cart');
  query.where('uuid', '=', uuid).and('status', '=', 1);
  const data = await query.load(pool);
  if (!data) {
    return null;
  } else {
    const cart = new Cart({ ...data });
    await cart.build();
    return cart;
  }
};

const { getCart } = require('./cart/Cart');

module.exports = exports;

/**
 * This function returns a Cart object by ID.
 * @param {*} id
 * @returns {Promise<Cart>}
 */
exports.getCartByUUID = async (uuid) => {
  const cart = await getCart(uuid);
  return cart;
};

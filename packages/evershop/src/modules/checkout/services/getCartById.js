const { select } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../lib/mysql/connection");
const { Cart } = require("./cart/Cart");

module.exports = exports;

/**
 * This function returns a Cart object by ID. 
 * It only return
 * @param {*} id 
 * @returns {Promise<Cart || null> }
 */
exports.getCartById = async (id) => {
  const query = select()
    .from('cart');
  query.where('cart_id', '=', id);
  const data = await query.load(pool);
  if (!data) {
    return null;
  } else {
    let cart = new Cart({ ...data });
    await cart.build();
    return cart;
  }
}
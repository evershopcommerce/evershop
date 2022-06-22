const { select } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../lib/mysql/connection");
const { Cart } = require("./cart/cart");

module.exports = exports;

exports.initCart = async (cartId = null, request) => {
  let cart;
  if (cartId) {
    // Check status of the cart
    const c = await select().from('cart')
      .where('cart_id', '=', cartId)
      .and('status', '=', 1)
      .load(pool);
    if (c) {
      cart = new Cart(request, { ...c });
    } else {
      throw new Error(`Cart with id ${cartId} does not exist`);
    }
  } else {
    cart = new Cart(request);
  }
  await cart.build();
  return cart;
}
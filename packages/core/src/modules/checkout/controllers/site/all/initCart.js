const { select } = require('@nodejscart/mysql-query-builder');
const { Cart } = require('../../../services/cart/cart');
const { pool } = require('../../../../../lib/mysql/connection');

// eslint-disable-next-line no-unused-vars
module.exports = async (request, response, stack) => {
  let cart;
  // Check if there is a cart id in session
  if (request.session.cartId) {
    // Check status of the cart
    const c = await select().from('cart')
      .where('cart_id', '=', request.session.cartId)
      .and('status', '=', 1)
      .load(pool);
    if (c) {
      cart = new Cart(request, { ...c });
    } else {
      // Remove cartId from session
      request.session.cartId = undefined;
    }
  }

  // If there is no cart available, create a new cart object
  if (!cart) {
    cart = new Cart(request);
  }

  await cart.build();
  return cart;
};

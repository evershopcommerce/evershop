const { select } = require("@evershop/mysql-query-builder");
const { pool } = require("../../../lib/mysql/connection");
const { Cart } = require("./cart/Cart");

module.exports = exports;

/**
 * This function return a Cart object by tokenPayload. Do not use this function directly.
 * Use CartFactory.getCart() instead.
 * @param {*} tokenPayLoad : The payload of the jwt token
 * @returns {Promise<Cart>}
 */
exports.getCustomerCart = async (tokenPayLoad) => {
  const user = tokenPayLoad?.user || {};
  const sid = tokenPayLoad?.sid || null;
  const customerId = user?.customerId || null;
  let cart;
  // Extract the user info
  const {
    customerId: customer_id,
    email: customer_email,
    groupId: customer_group_id,
    fullName: customer_full_name
  } = user;

  // Try to get the cart by the session id first
  const cartBySid = await select()
    .from('cart')
    .where('status', '=', 1)
    .andWhere('sid', '=', sid)
    .load(pool);

  if (cartBySid) {
    cart = new Cart({ sid, customer_id, customer_email, customer_group_id, customer_full_name, ...cartBySid });
  } else {
    // Try to get the cart by the customer id
    const cartByCustomerId = await select()
      .from('cart')
      .where('status', '=', 1)
      .andWhere('customer_id', '=', customerId)
      .load(pool);

    if (cartByCustomerId) {
      cart = new Cart({ sid, customer_id, customer_email, customer_group_id, customer_full_name, ...cartByCustomerId });
    } else {
      // Create a new cart
      cart = new Cart({ sid, customer_id, customer_email, customer_group_id, customer_full_name });
    }
  }

  await cart.build();
  return cart;
}

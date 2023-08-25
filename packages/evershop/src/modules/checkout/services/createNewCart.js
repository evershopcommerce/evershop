/* eslint-disable camelcase */
const { Cart } = require('./cart/Cart');

module.exports = exports;

/**
 * This function return a Cart object by the session ID and the customer object
 * Use CartFactory.getCart() instead.
 * @param {string} sid : The session ID
 * @param {Object} customer : The customer object
 * @returns {Promise<Cart>}
 */
exports.createNewCart = async (sid, customer = {}) => {
  // Extract the customer info
  const {
    customerId: customer_id,
    email: customer_email,
    groupId: customer_group_id,
    fullName: customer_full_name
  } = customer;
  const cart = new Cart({
    sid,
    customer_id,
    customer_email,
    customer_group_id,
    customer_full_name
  });
  await cart.build();
  return cart;
};

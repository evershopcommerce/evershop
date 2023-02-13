/* eslint-disable camelcase */
const { Cart } = require('./cart/Cart');

module.exports = exports;

/**
 * This function return a Cart object by customerTokenPayload. Do not use this function directly.
 * Use CartFactory.getCart() instead.
 * @param {*} tokenPayLoad : The payload of the jwt token
 * @returns {Promise<Cart>}
 */
exports.createNewCart = async (customerTokenPayload = {}) => {
  const customer = customerTokenPayload?.customer || {};
  const sid = customerTokenPayload?.sid || null;
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

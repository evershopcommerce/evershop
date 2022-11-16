const { select, commit, update, del, insert } = require("@evershop/mysql-query-builder");
const { pool, getConnection } = require("../../../lib/mysql/connection");
const { Cart } = require("./cart/Cart");

module.exports = exports;

/**
 * This function return a Cart object by tokenPayload. Do not use this function directly.
 * Use CartFactory.getCart() instead.
 * @param {*} tokenPayLoad : The payload of the jwt token
 * @returns {Promise<Cart>}
 */
exports.createNewCart = async (tokenPayLoad = {}) => {
  const user = tokenPayLoad?.user || {};
  const sid = tokenPayLoad?.sid || null;
  // Extract the user info
  const {
    customerId: customer_id,
    email: customer_email,
    groupId: customer_group_id,
    fullName: customer_full_name
  } = user;
  return new Cart({ sid, customer_id, customer_email, customer_group_id, customer_full_name });
}

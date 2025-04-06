import { createNewCart as create } from './cart/Cart.js';

/**
 * This function return a Cart object by the session ID and the customer object
 * Use CartFactory.getCart() instead.
 * @param {string} sid : The session ID
 * @param {Object} customer : The customer object
 * @returns {Promise<Cart>}
 */
export async function createNewCart(sid, customer = {}) {
  // Extract the customer info
  const {
    customerId: customer_id,
    email: customer_email,
    groupId: customer_group_id,
    fullName: customer_full_name
  } = customer;
  const cart = await create({
    sid,
    customer_id,
    customer_email,
    customer_group_id,
    customer_full_name
  });
  return cart;
}

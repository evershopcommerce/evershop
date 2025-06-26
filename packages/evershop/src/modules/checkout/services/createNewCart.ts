import { CustomerData } from '../../../modules/customer/services/customer/createCustomer.js';
import { Cart, createNewCart as create } from './cart/Cart.js';

/**
 * Create a new cart for the customer
 * @param sid - The session ID
 * @param customer - The customer data
 * @returns The created cart
 */
export async function createNewCart(
  sid: string,
  customer: CustomerData = {}
): Promise<Cart> {
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

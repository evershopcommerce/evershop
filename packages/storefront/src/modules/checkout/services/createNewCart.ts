import { CustomerData } from '../../../modules/customer/services/customer/createCustomer.js';
import { Cart, createNewCart as create } from './cart/Cart.js';

export /**
 * Create a new cart for the customer
 * @param sid - The session ID
 * @param customer - The customer data
 * @returns The created cart
 */
async function createNewCart(
  sid: string,
  customer: CustomerData & { customer_id?: number } = {}
): Promise<Cart> {
  // Extract the customer info
  const {
    customer_id: customer_id,
    email: customer_email,
    group_id: customer_group_id,
    full_name: customer_full_name
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

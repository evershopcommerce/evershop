import { hookable } from '../../../lib/util/hookable.js';
import { CheckoutData } from '../../../types/checkoutData.js';
import { addBillingAddress } from './addBillingAddress.js';
import { addShippingAddress } from './addShippingAddress.js';
import { getCartByUUID } from './getCartByUUID.js';
import { createOrder } from './orderCreator.js';
import { saveCart } from './saveCart.js';

async function checkoutService(
  cartId: string,
  data: CheckoutData,
  context: Record<string, unknown> = {}
) {
  // Validate if cart is exist (this time we use getCartByUUID function)
  const cart = await getCartByUUID(cartId);

  if (!cart) {
    throw new Error('Cart not found');
  }

  // Add customer info
  if (data.customer?.id) {
    await cart.setData('customer_id', data.customer.id);
  }
  if (data.customer?.email) {
    await cart.setData('customer_email', data.customer.email);
  }
  if (data.customer?.fullName) {
    await cart.setData('customer_full_name', data.customer.fullName);
  }

  // Add Shipping Address
  if (data.shippingAddress) {
    const shippingAddress = await addShippingAddress(
      cart.getData('uuid'),
      data.shippingAddress,
      context
    );
    await cart.setData('shipping_address_id', shippingAddress.cart_address_id);
  }

  // Add Billing Address
  if (data.billingAddress) {
    const billingAddress = await addBillingAddress(
      cart.getData('uuid'),
      data.billingAddress,
      context
    );
    await cart.setData('billing_address_id', billingAddress.cart_address_id);
  }

  // Add Payment Method
  if (data.paymentMethod) {
    await cart.setData('payment_method', data.paymentMethod);
  }

  // Add Shipping Method (use cart.setData)
  if (data.shippingMethod) {
    await cart.setData('shipping_method', data.shippingMethod);
  }

  // Add Note (use cart.setData)
  if (data.note) {
    await cart.setData('note', data.note);
  }
  await saveCart(cart);
  const order = await createOrder(cart);
  return order;
}

/**
 * Hookable wrapper for the checkout service.
 * This allows third-party extensions to hook before or after the checkout process.
 */
export const checkout = async (
  cartId: string,
  data: CheckoutData,
  context: Record<string, unknown> = {}
) => {
  const result = await hookable(checkoutService, {
    cartId,
    data,
    ...context
  })(cartId, data, context);
  return result;
};

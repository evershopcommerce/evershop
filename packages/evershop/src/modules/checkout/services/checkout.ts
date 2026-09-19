import { hookable, hookBefore, hookAfter } from '../../../lib/util/hookable.js';
import { CheckoutData } from '../../../types/checkoutData.js';
import { addBillingAddress } from './addBillingAddress.js';
import { addShippingAddress } from './addShippingAddress.js';
import { getCartByUUID } from './getCartByUUID.js';
import { createOrder } from './orderCreator.js';
import { saveCart } from './saveCart.js';
import { setShippingMethod } from './setShippingMethod.js';

const _checkout = async function checkout(
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

  // Add Shipping Method via the dedicated service so the enriched snapshot
  // is computed before setData is called.
  //
  // Provider resolution:
  //   1. Prefer `data.shippingProvider` from the client.
  //   2. Otherwise fall back to the cart's persisted
  //      `shipping_method_data.provider_code` (the snapshot written when the
  //      customer picked the method earlier on the checkout page). This
  //      back-compat path covers storefronts that POST `checkoutApi` with a
  //      bare `shippingMethod: "ups_ground"` and no provider field — the
  //      payload shape that originally surfaced the "Selected shipping method
  //      is no longer available" bug after the registry refactor.
  //   3. Mismatch (persisted method code != requested) OR neither source →
  //      throw a clear error. NEVER default to 'core'.
  if (data.shippingMethod) {
    const persisted = cart.getData('shipping_method_data') as
      | { provider_code?: string; method_code?: string }
      | null
      | undefined;
    let providerCode = data.shippingProvider;
    if (!providerCode) {
      if (
        persisted?.provider_code &&
        persisted.method_code === data.shippingMethod
      ) {
        providerCode = persisted.provider_code;
      } else {
        throw new Error(
          `Cannot set shipping method "${data.shippingMethod}": shippingProvider is missing and the cart has no matching persisted provider.`
        );
      }
    }
    await setShippingMethod(cart, {
      provider_code: providerCode,
      method_code: data.shippingMethod
    });
  }

  // Add shipping note. The registered cart field is `shipping_note` (see
  // registerCartBaseFields.js) and `orderCreator` copies it to the order's
  // `shipping_note` column via cart.exportData(). NOTE: the key must be
  // `shipping_note`, not `note` — DataObject.setData throws
  // "Field note not existed" for an unregistered key, which would abort the
  // whole order placement the moment a note is submitted.
  if (typeof data.note === 'string') {
    await cart.setData('shipping_note', data.note);
  }
  await saveCart(cart);
  const order = await createOrder(cart);
  return order;
};

/**
 * Hookable wrapper for the checkout service.
 * This allows third-party extensions to hook before or after the checkout process.
 */
export async function checkout(
  cartId: string,
  data: CheckoutData,
  context: Record<string, unknown> = {}
) {
  const result = await hookable(_checkout, {
    cartId,
    data,
    ...context
  })(cartId, data, context);
  return result;
}

export function hookBeforeCheckout(
  callback: (
    this: { cartId: string; data: CheckoutData; [key: string]: unknown },
    ...args: [
      cartId: string,
      data: CheckoutData,
      context: Record<string, unknown>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookBefore('checkout', callback, priority);
}

export function hookAfterCheckout(
  callback: (
    this: { cartId: string; data: CheckoutData; [key: string]: unknown },
    ...args: [
      cartId: string,
      data: CheckoutData,
      context: Record<string, unknown>
    ]
  ) => void | Promise<void>,
  priority: number = 10
): void {
  hookAfter('checkout', callback, priority);
}

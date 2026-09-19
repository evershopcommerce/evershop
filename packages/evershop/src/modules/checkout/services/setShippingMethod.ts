import type { Cart } from './cart/Cart.js';
import {
  resolveShippingQuote,
  type ShippingMethodIntent
} from './shipping/resolveShippingQuote.js';

/**
 * Set the cart's shipping method from a bare `{ provider_code, method_code }`
 * intent. Fully resolves the quote (provider call, fingerprint, timestamp)
 * before writing, so the cart's `shipping_method_data` field resolver — which
 * is constrained to return what was set on the setData path — can pass the
 * input through unchanged.
 *
 * Callers MUST go through this service rather than calling
 * `cart.setData('shipping_method_data', ...)` directly. Setting a bare intent
 * would bypass the quote resolution and store a value without snapshot or
 * fingerprint, breaking dependent fields (shipping fee, taxes) and the
 * cache-by-fingerprint path on rebuild.
 *
 * Throws `ShippingQuoteError` (from `resolveShippingQuote`) when the intent
 * can't be resolved — no provider, no zone, method no longer applies, etc.
 * API handlers translate those to user-facing error responses.
 *
 * See wiki/shipping-provider-design.md → "Recompute on cart change".
 */
export async function setShippingMethod(
  cart: Cart,
  intent: ShippingMethodIntent
): Promise<void> {
  const enriched = await resolveShippingQuote(cart, intent);
  await cart.setData('shipping_method_data', enriched);
}

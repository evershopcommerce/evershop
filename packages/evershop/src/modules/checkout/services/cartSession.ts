import { update } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';

/**
 * A cart is linked to a browser session by `cart.sid`, and to a customer by
 * `cart.customer_id`. Signing out keeps the browser session, so the cart of
 * the customer who signed out stayed linked to it, and the next person on
 * that browser — a guest, or another customer who signs in — was handed
 * that cart: its items, and its billing and shipping address (name, phone,
 * address). The helpers below keep a customer's cart away from anyone else
 * on the same session.
 */

/**
 * Whether the session's cart belongs to a customer other than the visitor:
 * it has an owner, and the visitor is a guest or signed in as someone else.
 * A guest cart (no owner) belongs to whoever holds the session.
 */
export function belongsToAnotherCustomer(
  cart: { customer_id?: number | string | null },
  customerId?: number | null
): boolean {
  if (cart.customer_id === null || cart.customer_id === undefined) return false;
  return Number(cart.customer_id) !== Number(customerId ?? NaN);
}

/**
 * Unlink a cart from the browser session it is linked to. The cart is not
 * touched otherwise: it stays its customer's, and `getMyCart` links it to
 * their session again at their next sign-in.
 */
export async function releaseCartFromSession(cartId: number): Promise<void> {
  await update('cart').given({ sid: null }).where('cart_id', '=', cartId).execute(pool);
}

import { buildAbsoluteUrl } from '../../../lib/router/buildAbsoluteUrl.js';
import {
  isCartRecoveryConfigured,
  signCartRecoveryToken
} from './cartRecoveryToken.js';

/**
 * The absolute link that gives a cart's products back to a shopper, in any
 * browser (`/cart/recover/<token>`), for an abandoned-cart email for
 * example. Make it when the email is sent: it works for
 * `checkout.cartRecovery.ttlDays` (default 30) from then, once, and stops
 * once the cart is ordered. Takes the cart's `cart_id`.
 *
 * Returns null when the `CART_RECOVERY_TOKEN_SECRET` env var is not set:
 * leave the link out of the email then.
 */
export function buildCartRecoveryUrl(cartId: number): string | null {
  if (!isCartRecoveryConfigured()) {
    return null;
  }
  return buildAbsoluteUrl('cartRecover', {
    token: signCartRecoveryToken(cartId)
  });
}

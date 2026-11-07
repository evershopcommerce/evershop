import jwt from 'jsonwebtoken';
import { warning } from '../../../lib/log/logger.js';
import { getConfig } from '../../../lib/util/getConfig.js';

const ISSUER = 'evershop:cart-recovery';
const AUDIENCE = 'cart-recovery';
const DEFAULT_TTL_DAYS = 30;

/**
 * Token of a cart recovery link (`buildCartRecoveryUrl`): a link that gives
 * a saved cart back to a shopper, in any browser, for example from an
 * abandoned-cart email. Signed JWT (HS256) with its own secret, like the
 * order tracking token (`oms/services/anonymousTrackingToken.ts`), so the
 * login keys never appear in an email. It carries only the cart's
 * `cart_id` and the expiry. Not the uuid: the payload is readable, and a
 * cart uuid opens the cart through the public cart APIs. Each link is made
 * when it is sent; it stops working after `checkout.cartRecovery.ttlDays`
 * (default 30), once used, or once the cart is ordered.
 *
 * Secret: the `CART_RECOVERY_TOKEN_SECRET` env var. Without it,
 * `signCartRecoveryToken` throws and `verifyCartRecoveryToken` returns
 * `{ ok: false, reason: 'no_secret' }`. Changing it cancels every link.
 */

function getSecret(): string {
  const secret = process.env.CART_RECOVERY_TOKEN_SECRET;
  if (!secret) {
    throw new Error('CART_RECOVERY_TOKEN_SECRET env var is not configured');
  }
  return secret;
}

export function isCartRecoveryConfigured(): boolean {
  return Boolean(process.env.CART_RECOVERY_TOKEN_SECRET);
}

function getDefaultTtlSeconds(): number {
  const ttlDays = Number(
    getConfig('checkout.cartRecovery.ttlDays', DEFAULT_TTL_DAYS)
  );
  if (!Number.isFinite(ttlDays) || ttlDays <= 0) {
    // 0, null or '14d' would make every link dead on arrival, or make
    // jsonwebtoken throw: fall back to the default
    warning(
      `checkout.cartRecovery.ttlDays must be a number of days above 0; using ${DEFAULT_TTL_DAYS}`
    );
    return DEFAULT_TTL_DAYS * 24 * 60 * 60;
  }
  return ttlDays * 24 * 60 * 60;
}

export function signCartRecoveryToken(
  cartId: number,
  ttlDays?: number
): string {
  if (!Number.isInteger(cartId) || cartId <= 0) {
    throw new TypeError(`cartId must be a cart_id, got ${String(cartId)}`);
  }
  const expiresIn =
    ttlDays !== undefined ? ttlDays * 24 * 60 * 60 : getDefaultTtlSeconds();
  return jwt.sign({ cartId }, getSecret(), {
    expiresIn,
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: 'HS256'
  });
}

export type VerifyCartRecoveryTokenResult =
  | { ok: true; cartId: number; expiresAt: number }
  | { ok: false; reason: 'expired' | 'invalid' | 'no_secret' };

export function verifyCartRecoveryToken(
  token: string
): VerifyCartRecoveryTokenResult {
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return { ok: false, reason: 'no_secret' };
  }
  try {
    const decoded = jwt.verify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256']
    }) as { cartId?: unknown; exp: number };
    const { cartId } = decoded;
    if (
      typeof cartId !== 'number' ||
      !Number.isInteger(cartId) ||
      cartId <= 0
    ) {
      return { ok: false, reason: 'invalid' };
    }
    return { ok: true, cartId, expiresAt: decoded.exp };
  } catch (e: unknown) {
    const name = (e as { name?: string }).name;
    if (name === 'TokenExpiredError') return { ok: false, reason: 'expired' };
    return { ok: false, reason: 'invalid' };
  }
}

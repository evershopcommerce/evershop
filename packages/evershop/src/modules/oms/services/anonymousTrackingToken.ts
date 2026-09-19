import jwt from 'jsonwebtoken';
import { getConfig } from '../../../lib/util/getConfig.js';

const ISSUER = 'evershop:tracking';
const AUDIENCE = 'order-tracking';
const DEFAULT_TTL_DAYS = 90;

/**
 * Token used to grant an anonymous customer access to their order tracking
 * page via the link embedded in lifecycle emails. Signed JWT (HS256) with a
 * dedicated secret so the customer / admin login JWT keys never appear in an
 * email. Carries only the order UUID and exp; the verifier returns the UUID
 * to the page handler which then loads the order normally.
 *
 * Secret comes from the `ORDER_TRACKING_TOKEN_SECRET` env var. If unset,
 * `signTrackingToken` throws and `verifyTrackingToken` returns
 * `{ ok: false, reason: 'no_secret' }` — the page handler treats that as a
 * misconfiguration and renders the "this link is no longer valid" view.
 *
 * TTL defaults to 90 days, overridable via `oms.tracking.anonymousTokenTtlDays`
 * in the user config.
 */

function getSecret(): string {
  const secret = process.env.ORDER_TRACKING_TOKEN_SECRET;
  if (!secret) {
    throw new Error('ORDER_TRACKING_TOKEN_SECRET env var is not configured');
  }
  return secret;
}

function getDefaultTtlSeconds(): number {
  const ttlDays = getConfig(
    'oms.tracking.anonymousTokenTtlDays',
    DEFAULT_TTL_DAYS
  ) as number;
  return ttlDays * 24 * 60 * 60;
}

export function signTrackingToken(
  orderUuid: string,
  ttlDays?: number
): string {
  const expiresIn =
    ttlDays !== undefined
      ? ttlDays * 24 * 60 * 60
      : getDefaultTtlSeconds();
  return jwt.sign({ orderUuid }, getSecret(), {
    expiresIn,
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: 'HS256'
  });
}

export type VerifyTrackingTokenResult =
  | { ok: true; orderUuid: string; expiresAt: number }
  | { ok: false; reason: 'expired' | 'invalid' | 'no_secret' };

export function verifyTrackingToken(token: string): VerifyTrackingTokenResult {
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
    }) as { orderUuid: string; exp: number };
    return {
      ok: true,
      orderUuid: decoded.orderUuid,
      expiresAt: decoded.exp
    };
  } catch (e: unknown) {
    const name = (e as { name?: string }).name;
    if (name === 'TokenExpiredError') return { ok: false, reason: 'expired' };
    return { ok: false, reason: 'invalid' };
  }
}

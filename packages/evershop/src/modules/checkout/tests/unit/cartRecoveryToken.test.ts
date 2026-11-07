import { afterEach, describe, expect, it, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

/**
 * The cart recovery link's token: signed with its own secret, issuer and
 * audience, carrying the cart's `cart_id` (not the uuid: the payload is
 * readable, and a uuid opens the cart through the public cart APIs) and an
 * expiry from `checkout.cartRecovery.ttlDays` (default 30).
 */

const SECRET = 'unit-test-cart-recovery-secret-at-least-32-chars';
const CART = 42;
const warnings: string[] = [];
const DAY = 24 * 60 * 60;
const config: Record<string, unknown> = {};

jest.unstable_mockModule('../../../../lib/util/getConfig.js', () => ({
  getConfig: (path: string, defaultValue: unknown) =>
    path in config ? config[path] : defaultValue
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  warning: (message: string) => warnings.push(message),
  error: () => undefined,
  debug: () => undefined
}));

process.env.CART_RECOVERY_TOKEN_SECRET = SECRET;
const {
  isCartRecoveryConfigured,
  signCartRecoveryToken,
  verifyCartRecoveryToken
} = await import('../../services/cartRecoveryToken.js');

const now = () => Math.floor(Date.now() / 1000);

afterEach(() => {
  process.env.CART_RECOVERY_TOKEN_SECRET = SECRET;
  delete config['checkout.cartRecovery.ttlDays'];
});

describe('cartRecoveryToken', () => {
  it('gives back the cart_id it was signed with, and nothing else readable', () => {
    const token = signCartRecoveryToken(CART);
    expect(verifyCartRecoveryToken(token)).toEqual({ ok: true, cartId: CART, expiresAt: expect.any(Number) });
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    expect(Object.keys(payload).sort()).toEqual(['aud', 'cartId', 'exp', 'iat', 'iss']);
  });

  it('signs only a cart_id (a positive integer)', () => {
    for (const bad of [0, -1, 1.5, NaN, '42' as unknown as number]) {
      expect(() => signCartRecoveryToken(bad)).toThrow(TypeError);
    }
  });

  it('a bad checkout.cartRecovery.ttlDays falls back to 30 days, with a warning', () => {
    for (const bad of [0, -1, null, '14d', 'abc']) {
      config['checkout.cartRecovery.ttlDays'] = bad;
      warnings.length = 0;
      const result = verifyCartRecoveryToken(signCartRecoveryToken(CART));
      expect(result.ok && result.expiresAt - now()).toBeGreaterThan(30 * DAY - 5);
      expect(warnings).toHaveLength(1);
    }
  });

  it('expires after 30 days by default, or after checkout.cartRecovery.ttlDays', () => {
    const byDefault = verifyCartRecoveryToken(signCartRecoveryToken(CART));
    expect(byDefault.ok && byDefault.expiresAt - now()).toBeGreaterThan(30 * DAY - 5);
    expect(byDefault.ok && byDefault.expiresAt - now()).toBeLessThanOrEqual(30 * DAY);

    config['checkout.cartRecovery.ttlDays'] = 7;
    const configured = verifyCartRecoveryToken(signCartRecoveryToken(CART));
    expect(configured.ok && configured.expiresAt - now()).toBeGreaterThan(7 * DAY - 5);
    expect(configured.ok && configured.expiresAt - now()).toBeLessThanOrEqual(7 * DAY);
  });

  it('refuses an expired token', async () => {
    const token = signCartRecoveryToken(CART, 0);
    await new Promise((resolve) => {
      setTimeout(resolve, 1100);
    });
    expect(verifyCartRecoveryToken(token)).toEqual({ ok: false, reason: 'expired' });
  });

  it('refuses a token signed with another secret, and a changed one', () => {
    const token = signCartRecoveryToken(CART);
    process.env.CART_RECOVERY_TOKEN_SECRET = 'another-secret-another-secret-another';
    expect(verifyCartRecoveryToken(token)).toEqual({ ok: false, reason: 'invalid' });

    process.env.CART_RECOVERY_TOKEN_SECRET = SECRET;
    const [header, payload, signature] = token.split('.');
    const changed = `${header}.${payload.slice(0, -1)}${payload.endsWith('A') ? 'B' : 'A'}.${signature}`;
    expect(verifyCartRecoveryToken(changed)).toEqual({ ok: false, reason: 'invalid' });
  });

  it("refuses another link's token signed with the same secret (the order tracking token)", () => {
    const tracking = jwt.sign({ orderUuid: 'u-1', cartId: CART }, SECRET, {
      expiresIn: DAY,
      issuer: 'evershop:tracking',
      audience: 'order-tracking',
      algorithm: 'HS256'
    });
    expect(verifyCartRecoveryToken(tracking)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('refuses a token without a cart_id, or with the uuid of an earlier version', () => {
    for (const payload of [{}, { cartId: '42' }, { cartId: 0 }, { cartUuid: '6b6e1d10-8a3a-4f7a-9c4f-9b1c4a1a7777' }]) {
      const token = jwt.sign(payload, SECRET, {
        expiresIn: DAY,
        issuer: 'evershop:cart-recovery',
        audience: 'cart-recovery',
        algorithm: 'HS256'
      });
      expect(verifyCartRecoveryToken(token)).toEqual({ ok: false, reason: 'invalid' });
    }
  });

  it('without the secret: signing throws, checking says no_secret', () => {
    delete process.env.CART_RECOVERY_TOKEN_SECRET;
    expect(isCartRecoveryConfigured()).toBe(false);
    expect(() => signCartRecoveryToken(CART)).toThrow('CART_RECOVERY_TOKEN_SECRET');
    expect(verifyCartRecoveryToken('any.token.value')).toEqual({ ok: false, reason: 'no_secret' });
  });
});

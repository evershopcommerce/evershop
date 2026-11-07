import { readFileSync } from 'fs';
import { describe, expect, it, jest } from '@jest/globals';

/**
 * `buildCartRecoveryUrl` (public, `@evershop/evershop/checkout/services`):
 * the absolute `cartRecover` URL with a fresh token, or null without the
 * secret so a mailer leaves the link out.
 */

const CART = 42;
const built: Array<{ routeId: string; params: Record<string, string> }> = [];

jest.unstable_mockModule('../../../../lib/router/buildAbsoluteUrl.js', () => ({
  buildAbsoluteUrl: (routeId: string, params: Record<string, string>) => {
    built.push({ routeId, params });
    return `https://shop.test/cart/recover/${params.token}`;
  }
}));

process.env.CART_RECOVERY_TOKEN_SECRET = 'unit-test-cart-recovery-secret-at-least-32-chars';
const { buildCartRecoveryUrl } = await import('../../services/buildCartRecoveryUrl.js');
const { verifyCartRecoveryToken } = await import('../../services/cartRecoveryToken.js');

describe('buildCartRecoveryUrl', () => {
  it('builds the cartRecover URL with a token for the cart', () => {
    const url = buildCartRecoveryUrl(CART);
    expect(built).toEqual([{ routeId: 'cartRecover', params: { token: expect.any(String) } }]);
    expect(url).toBe(`https://shop.test/cart/recover/${built[0].params.token}`);
    expect(verifyCartRecoveryToken(built[0].params.token)).toMatchObject({ ok: true, cartId: CART });
  });

  it('returns null without CART_RECOVERY_TOKEN_SECRET', () => {
    const secret = process.env.CART_RECOVERY_TOKEN_SECRET;
    delete process.env.CART_RECOVERY_TOKEN_SECRET;
    try {
      built.length = 0;
      expect(buildCartRecoveryUrl(CART)).toBeNull();
      expect(built).toEqual([]);
    } finally {
      process.env.CART_RECOVERY_TOKEN_SECRET = secret;
    }
  });

  it('is exported from the checkout services', async () => {
    const services = readFileSync(new URL('../../services/index.js', import.meta.url), 'utf8');
    expect(services).toMatch(/export\s*\{\s*buildCartRecoveryUrl\s*\}\s*from\s*["']\.\/buildCartRecoveryUrl\.js["']/);
  });

  it('the link route takes the token in the path; /cart/recover answers GET and POST', () => {
    const route = (id: string) =>
      JSON.parse(readFileSync(new URL(`../../pages/frontStore/${id}/route.json`, import.meta.url), 'utf8'));
    expect(route('cartRecover')).toMatchObject({ methods: ['GET'], path: '/cart/recover/:token' });
    expect(route('cartRecoverConfirm')).toMatchObject({ methods: ['GET', 'POST'], path: '/cart/recover' });
  });
});

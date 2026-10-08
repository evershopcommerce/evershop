import {
  buildTokenCacheKey,
  isTokenValid
} from '../../services/requester.js';

/**
 * Regression for the sandbox→live switch lockout. The token cache used a
 * single `app.locals.paypalAccessToken` slot with no environment/credential
 * key, so after switching the PayPal environment (or rotating the client id)
 * the stale token kept 401-ing for up to ~9h until the process restarted.
 * The cache is now keyed per (environment, clientId), and tokens are retired
 * 60s before their real expiry so one can't die mid-request.
 */
describe('paypal token cache', () => {
  const NOW = 1_700_000_000_000;
  const NINE_HOURS = 32400; // PayPal's usual expires_in, in seconds

  describe('buildTokenCacheKey', () => {
    it('separates environments sharing a client id', () => {
      const sandbox = buildTokenCacheKey(
        'https://api-m.sandbox.paypal.com',
        'client-a'
      );
      const live = buildTokenCacheKey('https://api-m.paypal.com', 'client-a');
      expect(sandbox).not.toBe(live);
    });

    it('separates client ids sharing an environment', () => {
      const a = buildTokenCacheKey('https://api-m.paypal.com', 'client-a');
      const b = buildTokenCacheKey('https://api-m.paypal.com', 'client-b');
      expect(a).not.toBe(b);
    });
  });

  describe('isTokenValid', () => {
    it('rejects a missing token', () => {
      expect(isTokenValid(undefined, NOW)).toBe(false);
      expect(isTokenValid(null, NOW)).toBe(false);
    });

    it('accepts a fresh token', () => {
      const token = {
        access_token: 't',
        expires_in: NINE_HOURS,
        created_at: NOW - 1000
      };
      expect(isTokenValid(token, NOW)).toBe(true);
    });

    it('rejects an expired token', () => {
      const token = {
        access_token: 't',
        expires_in: NINE_HOURS,
        created_at: NOW - (NINE_HOURS + 10) * 1000
      };
      expect(isTokenValid(token, NOW)).toBe(false);
    });

    it('retires a token inside the 60s safety margin', () => {
      const token = {
        access_token: 't',
        expires_in: NINE_HOURS,
        created_at: NOW - (NINE_HOURS - 30) * 1000 // 30s of real life left
      };
      expect(isTokenValid(token, NOW)).toBe(false);
    });

    it('keeps a token just outside the margin', () => {
      const token = {
        access_token: 't',
        expires_in: NINE_HOURS,
        created_at: NOW - (NINE_HOURS - 120) * 1000 // 2min left
      };
      expect(isTokenValid(token, NOW)).toBe(true);
    });
  });
});

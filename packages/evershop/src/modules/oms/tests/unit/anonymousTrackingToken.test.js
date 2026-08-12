process.env.ALLOW_CONFIG_MUTATIONS = 'true';
process.env.ORDER_TRACKING_TOKEN_SECRET =
  'unit-test-secret-at-least-32-chars-aaaaaaaa';

import {
  signTrackingToken,
  verifyTrackingToken
} from '../../services/anonymousTrackingToken.js';

describe('anonymousTrackingToken', () => {
  it('round-trips a signed token back to the same order uuid', () => {
    const uuid = '6b6e1d10-8a3a-4f7a-9c4f-9b1c4a1a7777';
    const token = signTrackingToken(uuid);
    const result = verifyTrackingToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.orderUuid).toBe(uuid);
      expect(typeof result.expiresAt).toBe('number');
      expect(result.expiresAt).toBeGreaterThan(
        Math.floor(Date.now() / 1000)
      );
    }
  });

  it('rejects a token with the wrong secret', () => {
    const uuid = '11111111-1111-1111-1111-111111111111';
    const token = signTrackingToken(uuid);

    const original = process.env.ORDER_TRACKING_TOKEN_SECRET;
    process.env.ORDER_TRACKING_TOKEN_SECRET = 'a-totally-different-secret';
    try {
      const result = verifyTrackingToken(token);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid');
      }
    } finally {
      process.env.ORDER_TRACKING_TOKEN_SECRET = original;
    }
  });

  it('rejects an expired token', () => {
    // 0-day TTL: token expires immediately. Verify after a tiny wait.
    const uuid = '22222222-2222-2222-2222-222222222222';
    const token = signTrackingToken(uuid, 0);
    // jsonwebtoken's exp claim is in seconds; we sleep enough to make
    // sure the verify call sees a stale exp.
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = verifyTrackingToken(token);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reason).toBe('expired');
        }
        resolve();
      }, 1100);
    });
  });

  it('rejects a tampered token (modified payload)', () => {
    const token = signTrackingToken('33333333-3333-3333-3333-333333333333');
    const parts = token.split('.');
    // Flip a character in the payload to simulate tampering.
    const tamperedPayload =
      parts[1].slice(0, -1) + (parts[1].slice(-1) === 'A' ? 'B' : 'A');
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const result = verifyTrackingToken(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid');
    }
  });

  it('reports no_secret when the env var is missing', () => {
    const original = process.env.ORDER_TRACKING_TOKEN_SECRET;
    delete process.env.ORDER_TRACKING_TOKEN_SECRET;
    try {
      const result = verifyTrackingToken('any.token.value');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('no_secret');
      }
    } finally {
      process.env.ORDER_TRACKING_TOKEN_SECRET = original;
    }
  });
});

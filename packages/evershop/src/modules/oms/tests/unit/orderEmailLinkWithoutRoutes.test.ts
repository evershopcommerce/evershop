import { describe, it, expect, afterAll } from '@jest/globals';
import { getOrderEmailLink } from '../../services/orderEmailLink.js';

/**
 * Without the routes (a process that did not load them), getOrderEmailLink
 * fails loudly instead of returning an empty or hand-made link: the email's
 * subscriber logs the error, and nobody gets an email with a dead "View your
 * order" button. The event and cron processes load the routes at boot.
 * No route is loaded in this file.
 */
const ORDER = '6f1d0c5e-2b7a-4c1e-9f3a-8d2e4b6a1c90';
const originalSecret = process.env.ORDER_TRACKING_TOKEN_SECRET;
afterAll(() => {
  if (originalSecret === undefined) {
    delete process.env.ORDER_TRACKING_TOKEN_SECRET;
  } else {
    process.env.ORDER_TRACKING_TOKEN_SECRET = originalSecret;
  }
});

describe('getOrderEmailLink without routes', () => {
  it('throws for the account page link', () => {
    delete process.env.ORDER_TRACKING_TOKEN_SECRET;
    expect(() => getOrderEmailLink(ORDER)).toThrow(
      'Route orderView is not existed'
    );
  });

  it('throws for the tracking link', () => {
    process.env.ORDER_TRACKING_TOKEN_SECRET = 'test-tracking-secret';
    expect(() => getOrderEmailLink(ORDER)).toThrow(
      'Route orderTracking is not existed'
    );
  });
});

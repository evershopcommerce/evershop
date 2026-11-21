import { fileURLToPath } from 'url';
import {
  describe,
  it,
  expect,
  afterAll,
  beforeAll,
  beforeEach
} from '@jest/globals';
import { loadModuleRoutes } from '../../../../lib/router/loadModuleRoutes.js';
import { getBaseUrl } from '../../../../lib/util/getBaseUrl.js';
import { verifyTrackingToken } from '../../services/anonymousTrackingToken.js';
import { getOrderEmailLink } from '../../services/orderEmailLink.js';

/**
 * The order confirmation, shipment created and shipment delivered emails each
 * wrote the "View your order" link by hand, because the event process had no
 * routes for `buildUrl`. They now share `getOrderEmailLink`, built from the
 * real `orderTracking` / `orderView` routes, and the links are exactly the
 * ones they wrote before.
 */
const ORDER = '6f1d0c5e-2b7a-4c1e-9f3a-8d2e4b6a1c90';

beforeAll(() => {
  // The customer module's real routes, as the event process loads them
  loadModuleRoutes(fileURLToPath(new URL('../../../customer', import.meta.url)));
});

// Each test sets what it needs: nothing carries over, whatever the
// environment the suite runs in; the original values come back at the end
const ENV_KEYS = ['ORDER_TRACKING_TOKEN_SECRET', 'EVERSHOP_HOME_URL'];
const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]])
);
beforeEach(() => {
  ENV_KEYS.forEach((key) => delete process.env[key]);
});
afterAll(() => {
  ENV_KEYS.forEach((key) => {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  });
});

describe('getOrderEmailLink', () => {
  it('the signed tracking page when the token secret is set, as the emails wrote it', () => {
    process.env.ORDER_TRACKING_TOKEN_SECRET = 'test-tracking-secret';
    const link = getOrderEmailLink(ORDER);
    const token = new URL(link).searchParams.get('token') as string;
    expect(link).toBe(
      `${getBaseUrl()}/orders/${ORDER}/track?token=${encodeURIComponent(token)}`
    );
    expect(verifyTrackingToken(token)).toMatchObject({ orderUuid: ORDER });
  });

  it('the account order page when it is not, as the emails wrote it', () => {
    expect(getOrderEmailLink(ORDER)).toBe(
      `${getBaseUrl()}/account/orders/${ORDER}`
    );
  });

  it('a store under a sub-path keeps it, as before', () => {
    process.env.EVERSHOP_HOME_URL = 'https://shop.example.com/store/';
    expect(getOrderEmailLink(ORDER)).toBe(
      `${getBaseUrl()}/account/orders/${ORDER}`
    );
    expect(getOrderEmailLink(ORDER)).toBe(
      `https://shop.example.com/store/account/orders/${ORDER}`
    );
  });
});

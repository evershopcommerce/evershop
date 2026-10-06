process.env.ALLOW_CONFIG_MUTATIONS = 'true';
process.env.ORDER_TRACKING_TOKEN_SECRET =
  'unit-test-secret-at-least-32-chars-aaaaaaaa';

import { jest } from '@jest/globals';

/**
 * Each storefront page that loads an order decides how the visitor proved they
 * may see it. Only the pages that really verified something may call
 * `grantOrderAccess`. These tests pin that down, page by page.
 */
const UUID = '6b6e1d10-8a3a-4f7a-9c4f-9b1c4a1a7777';
const OTHER_UUID = '11111111-1111-1111-1111-111111111111';

let orderRows: any[] = [];
const dbCalls: any[] = [];
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {
    async query(q: any) {
      dbCalls.push(q);
      return { rows: orderRows };
    },
    release() {
      // nothing to release
    }
  }
}));

// The redirect branches build a URL from the route registry, which a unit test
// does not load.
jest.unstable_mockModule('../../../../lib/router/buildUrl.js', () => ({
  buildUrl: (routeId: string) => `/${routeId}`
}));

const { signTrackingToken } = await import(
  '../../services/anonymousTrackingToken.js'
);
const { default: checkoutSuccess } = await import(
  '../../../checkout/pages/frontStore/checkoutSuccess/index.js'
);
const { default: orderTracking } = await import(
  '../../../customer/pages/frontStore/orderTracking/index.js'
);
const { default: orderView } = await import(
  '../../../customer/pages/frontStore/orderView/index.js'
);

const makeRequest = (overrides: Record<string, any> = {}): any => ({
  params: {},
  query: {},
  sessionID: 'session-abc',
  locals: {},
  app: { locals: {} },
  isCustomerLoggedIn: () => false,
  ...overrides
});
const makeResponse = (): any => ({ redirect: jest.fn() });
const marker = (request: any) => request.locals?.context?.verifiedOrder;

beforeEach(() => {
  orderRows = [];
  dbCalls.length = 0;
});

describe('checkoutSuccess page (guest session proof)', () => {
  it('grants access with via=session when the order matches the session', async () => {
    orderRows = [{ uuid: UUID, sid: 'session-abc' }];
    const request = makeRequest({ params: { orderId: UUID } });
    const next = jest.fn();

    await checkoutSuccess(request, makeResponse(), next);

    expect(dbCalls[0].values).toEqual(
      expect.arrayContaining([UUID, 'session-abc'])
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(marker(request)).toEqual({ uuid: UUID, via: 'session' });
    expect(request.locals.context.orderId).toBe(UUID);
  });

  it('redirects and grants nothing when no order matches the session', async () => {
    orderRows = [];
    const request = makeRequest({ params: { orderId: UUID } });
    const response = makeResponse();
    const next = jest.fn();

    await checkoutSuccess(request, response, next);

    expect(response.redirect).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    expect(marker(request)).toBeUndefined();
  });
});

describe('orderTracking page (signed token proof)', () => {
  it('grants access with via=tracking_token for a valid token and matching path', () => {
    const request = makeRequest({
      params: { uuid: UUID },
      query: { token: signTrackingToken(UUID) }
    });
    const next = jest.fn();

    orderTracking(request, makeResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(request.locals.context.trackingStatus).toBe('ok');
    expect(marker(request)).toEqual({ uuid: UUID, via: 'tracking_token' });
  });

  it('grants nothing without a token', () => {
    const request = makeRequest({ params: { uuid: UUID } });
    orderTracking(request, makeResponse(), jest.fn());
    expect(request.locals.context.trackingStatus).toBe('invalid');
    expect(marker(request)).toBeUndefined();
  });

  it('grants nothing for a tampered token', () => {
    const request = makeRequest({
      params: { uuid: UUID },
      query: { token: `${signTrackingToken(UUID)}x` }
    });
    orderTracking(request, makeResponse(), jest.fn());
    expect(marker(request)).toBeUndefined();
  });

  it('grants nothing when the token is for a different order than the path', () => {
    const request = makeRequest({
      params: { uuid: OTHER_UUID },
      query: { token: signTrackingToken(UUID) }
    });
    orderTracking(request, makeResponse(), jest.fn());
    expect(request.locals.context.trackingStatus).toBe('mismatch');
    expect(marker(request)).toBeUndefined();
  });
});

describe('orderView page (login only)', () => {
  it('lets a logged-in customer through WITHOUT granting access to the uuid in the URL', () => {
    const request = makeRequest({
      params: { uuid: OTHER_UUID },
      isCustomerLoggedIn: () => true
    });
    const next = jest.fn();

    orderView(request, makeResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(request.locals.context.orderUuid).toBe(OTHER_UUID);
    // A login proves who the visitor is, not that this order is theirs. The
    // `order` resolver compares the customer with the order's owner.
    expect(marker(request)).toBeUndefined();
  });

  it('redirects a visitor who is not logged in', () => {
    const request = makeRequest({ params: { uuid: UUID } });
    const response = makeResponse();
    const next = jest.fn();

    orderView(request, response, next);

    expect(response.redirect).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    expect(marker(request)).toBeUndefined();
  });
});

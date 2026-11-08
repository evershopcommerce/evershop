import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * PayPal's abandoned order job cancels an order the buyer never paid through
 * `cancelAbandonedOrder`, which also gives the cart back (so the cart
 * recovery link works again), and finishes an order the buyer did approve.
 * PayPal, the database and the oms services are fakes.
 */
const calls: string[] = [];
let orders: Array<Record<string, unknown>> = [];
let paypalAnswers: Record<string, { status: number; data: unknown }> = {};

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({
  select: () => {
    const query: Record<string, unknown> = {};
    for (const step of ['from', 'where', 'and']) {
      query[step] = () => query;
    }
    query.execute = async () => orders;
    return query;
  }
}));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {}
}));
jest.unstable_mockModule('../../../../lib/util/getConfig.js', () => ({
  getConfig: () => ({})
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  debug: () => undefined,
  info: () => undefined,
  error: (e: Error) => calls.push(`error ${e.message}`)
}));
jest.unstable_mockModule(
  '../../../oms/services/cancelAbandonedOrder.js',
  () => ({
    cancelAbandonedOrder: async (uuid: string, reason: string) => {
      calls.push(`cancelAbandonedOrder ${uuid}: ${reason}`);
      return { cartReopened: true };
    }
  })
);
jest.unstable_mockModule('../../services/finalizePaypalOrder.js', () => ({
  finalizePaypalOrderOrFail: async (order: { uuid: string }) => {
    calls.push(`finalize ${order.uuid}`);
    return { paymentStatus: 'paypal_captured' };
  }
}));
jest.unstable_mockModule('../../services/requester.js', () => ({
  createStandaloneAxiosInstance: async () => ({
    get: async (url: string) =>
      paypalAnswers[url] ?? { status: 404, data: {} }
  })
}));

const { default: reconcile } = await import(
  '../../services/reconcileAbandonedOrders.js'
);

beforeEach(() => {
  calls.length = 0;
  paypalAnswers = {};
});

describe('reconcileAbandonedPaypalOrders', () => {
  it('cancels never-paid orders through cancelAbandonedOrder (the cart comes back); finishes an approved one', async () => {
    orders = [
      { uuid: 'o-never-started', integration_order_id: null },
      { uuid: 'o-gone', integration_order_id: 'PP-GONE' },
      { uuid: 'o-unapproved', integration_order_id: 'PP-1' },
      { uuid: 'o-approved', integration_order_id: 'PP-2' }
    ];
    paypalAnswers = {
      '/v2/checkout/orders/PP-1': { status: 200, data: { status: 'CREATED' } },
      '/v2/checkout/orders/PP-2': { status: 200, data: { status: 'APPROVED' } }
    };
    await reconcile();
    expect(calls).toEqual([
      'cancelAbandonedOrder o-never-started: Abandoned PayPal checkout: the payment was never started',
      'cancelAbandonedOrder o-gone: Abandoned PayPal checkout: the PayPal order no longer exists',
      'cancelAbandonedOrder o-unapproved: Abandoned PayPal checkout: the buyer never approved the payment',
      'finalize o-approved'
    ]);
  });
});

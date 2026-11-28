import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createOrder,
  failOrderPlacedWrites,
  openScratchDb,
  placedEvents,
  type ScratchDb
} from '../../../oms/tests/unit/helpers/orderScratchDb.js';

/**
 * The buyer's return from Stripe (`GET /stripe/return`) on a scratch database
 * with every core migration and the real oms and Stripe bootstraps; only
 * Stripe itself and URL building are faked. When the PaymentIntent is paid
 * the return page confirms the order itself, as the webhook does, so an order
 * is not left `pending` when the webhook never arrives:
 * - a succeeded intent is captured and a requires_capture intent authorized,
 *   the order is placed once, and the buyer lands on the success page;
 * - the webhook arriving later (or the buyer coming back again) changes nothing;
 * - an intent whose amount differs from the order, or that belongs to another
 *   order, is never recorded;
 * - a payment still processing is left to the webhook, a failed one is not
 *   recorded;
 * - a failure while confirming does not strand the buyer who paid.
 * Skips itself when no Postgres server is reachable.
 */
jest.setTimeout(60000);

const intents: Record<string, any> = {};
jest.unstable_mockModule('stripe', () => ({
  default: class {
    paymentIntents = {
      retrieve: async (id: string) => intents[id]
    };
  }
}));
// Routes are not loaded in a unit test
jest.unstable_mockModule('../../../../lib/router/buildUrl.js', () => ({
  buildUrl: (route: string, params?: Record<string, string>) =>
    params?.orderId ? `/${route}/${params.orderId}` : `/${route}`
}));

const scratch: ScratchDb | null = await openScratchDb(
  'evershop_stripe_return_scratch_test'
);
const describeDb = scratch ? describe : describe.skip;

describeDb('Stripe return page (scratch DB)', () => {
  const db = scratch?.db as ScratchDb['db'];
  let stripeReturn: (req: any, res: any, next: any) => Promise<void>;
  let confirmPaymentIntent: typeof import('../../services/confirmPaymentIntent.js')['confirmPaymentIntent'];

  beforeAll(async () => {
    await db.query(
      `INSERT INTO setting (name, value, is_json)
       VALUES ('stripeSecretKey', 'sk_test_return', false)`
    );
    for (const module of ['oms', 'stripe']) {
      const { default: bootstrap } = await import(
        `../../../${module}/bootstrap.js`
      );
      await bootstrap();
    }
    ({ default: stripeReturn } = await import(
      '../../pages/frontStore/stripeReturn/index.js'
    ));
    ({ confirmPaymentIntent } = await import(
      '../../services/confirmPaymentIntent.js'
    ));
  });

  afterAll(async () => {
    await scratch?.close();
  });

  let sequence = 0;
  const stripeOrder = async (over: Record<string, unknown> = {}) =>
    createOrder(db, { payment_method: 'stripe', grand_total: 10, ...over });
  function paymentIntent(
    order: Record<string, any>,
    status: string,
    over: Record<string, unknown> = {}
  ) {
    sequence += 1;
    const intent = {
      id: `pi_return_${sequence}`,
      status,
      amount: 1000,
      currency: 'usd',
      capture_method: 'automatic_async',
      metadata: { order_id: order.uuid },
      ...over
    };
    intents[intent.id] = intent;
    return intent;
  }
  /** The buyer comes back to the store; answers where they are sent */
  async function comeBack(orderUuid: string, intentId: string) {
    let location: string | undefined;
    const request: any = {
      query: { order_id: orderUuid, payment_intent: intentId },
      session: { save: (cb: () => void) => cb() }
    };
    const response: any = {
      redirect: (url: string) => {
        location = url;
      }
    };
    await stripeReturn(request, response, () => {});
    return location;
  }
  const row = async (id: number) =>
    (await db.query('SELECT * FROM "order" WHERE order_id = $1', [id])).rows[0];
  const transactions = async (id: number) =>
    (
      await db.query(
        'SELECT * FROM payment_transaction WHERE payment_transaction_order_id = $1',
        [id]
      )
    ).rows;

  it('a paid order whose webhook never came: captured, placed once, and the buyer lands on the success page', async () => {
    const order = await stripeOrder();
    const intent = paymentIntent(order, 'succeeded');
    expect(await comeBack(order.uuid, intent.id)).toBe(
      `/checkoutSuccess/${order.uuid}`
    );
    const confirmed = await row(order.order_id);
    expect(confirmed.payment_status).toBe('stripe_captured');
    expect(confirmed.placed_at).toBeInstanceOf(Date);
    expect(await placedEvents(db, order.order_id)).toHaveLength(1);
    expect(await transactions(order.order_id)).toEqual([
      expect.objectContaining({
        transaction_id: intent.id,
        payment_action: 'Automatic'
      })
    ]);
  });

  it('coming back again, or the webhook after the return, changes nothing', async () => {
    const order = await stripeOrder();
    const intent = paymentIntent(order, 'succeeded');
    await comeBack(order.uuid, intent.id);
    await comeBack(order.uuid, intent.id);
    // What the webhook runs for `payment_intent.succeeded`
    expect(await confirmPaymentIntent(order as any, intent as any, 'capture')).toBe(
      'recorded'
    );
    expect(await placedEvents(db, order.order_id)).toHaveLength(1);
    expect(await transactions(order.order_id)).toHaveLength(1);
    expect((await row(order.order_id)).payment_status).toBe('stripe_captured');
  });

  it('an authorized payment (requires_capture) is recorded as authorized', async () => {
    const order = await stripeOrder();
    const intent = paymentIntent(order, 'requires_capture', {
      capture_method: 'manual'
    });
    expect(await comeBack(order.uuid, intent.id)).toBe(
      `/checkoutSuccess/${order.uuid}`
    );
    expect((await row(order.order_id)).payment_status).toBe('stripe_authorized');
    expect(await placedEvents(db, order.order_id)).toHaveLength(1);
    expect(await transactions(order.order_id)).toEqual([
      expect.objectContaining({ payment_action: 'authorize' })
    ]);
  });

  it('an intent that does not match the order amount is never recorded', async () => {
    const order = await stripeOrder({ grand_total: 99 });
    const intent = paymentIntent(order, 'succeeded', { amount: 1000 });
    await comeBack(order.uuid, intent.id);
    expect((await row(order.order_id)).payment_status).toBe('pending');
    expect(await transactions(order.order_id)).toHaveLength(0);
    expect(await placedEvents(db, order.order_id)).toHaveLength(0);
  });

  it("another order's intent cannot confirm this order", async () => {
    const cheap = await stripeOrder();
    const dear = await stripeOrder({ grand_total: 10 });
    const intent = paymentIntent(cheap, 'succeeded');
    expect(await comeBack(dear.uuid, intent.id)).toBe('/homepage');
    expect((await row(dear.order_id)).payment_status).toBe('pending');
    expect((await row(cheap.order_id)).payment_status).toBe('pending');
    expect(await transactions(dear.order_id)).toHaveLength(0);
  });

  it('an order paid another way is not confirmed as a Stripe payment', async () => {
    const order = await stripeOrder({ payment_method: 'cod' });
    const intent = paymentIntent(order, 'succeeded');
    expect(await comeBack(order.uuid, intent.id)).toBe('/homepage');
    expect((await row(order.order_id)).payment_status).toBe('pending');
    expect(await transactions(order.order_id)).toHaveLength(0);
  });

  it('a payment still processing is left to the webhook', async () => {
    const order = await stripeOrder();
    const intent = paymentIntent(order, 'processing');
    expect(await comeBack(order.uuid, intent.id)).toBe(
      `/checkoutSuccess/${order.uuid}`
    );
    expect((await row(order.order_id)).payment_status).toBe('pending');
    expect(await transactions(order.order_id)).toHaveLength(0);
  });

  it('a payment that did not go through is not recorded: the order fails and the buyer is sent back to the cart', async () => {
    const order = await stripeOrder();
    const intent = paymentIntent(order, 'requires_payment_method');
    expect(await comeBack(order.uuid, intent.id)).toBe('/cart');
    expect((await row(order.order_id)).payment_status).toBe('stripe_failed');
    expect(await transactions(order.order_id)).toHaveLength(0);
    expect(await placedEvents(db, order.order_id)).toHaveLength(0);
  });

  it('an error while confirming does not strand the buyer: nothing is half written, and the webhook can still confirm', async () => {
    const order = await stripeOrder();
    const intent = paymentIntent(order, 'succeeded');
    const failing = await failOrderPlacedWrites(db);
    try {
      expect(await comeBack(order.uuid, intent.id)).toBe(
        `/checkoutSuccess/${order.uuid}`
      );
    } finally {
      await failing.off();
    }
    expect((await row(order.order_id)).payment_status).toBe('pending');
    expect(await transactions(order.order_id)).toHaveLength(0);

    await comeBack(order.uuid, intent.id);
    expect((await row(order.order_id)).payment_status).toBe('stripe_captured');
    expect(await placedEvents(db, order.order_id)).toHaveLength(1);
  });
});

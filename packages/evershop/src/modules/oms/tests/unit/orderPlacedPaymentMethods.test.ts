process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Stripe from 'stripe';
import {
  createOrder,
  failOrderPlacedWrites,
  openScratchDb,
  placedEvents,
  type ScratchDb
} from './helpers/orderScratchDb.js';

/**
 * COD, the zero-total checkout and Stripe mark an order placed through
 * `markOrderPlaced`, so each order gets one `order_placed`, carrying the order
 * as it is after the payment status change, with `placed_at` set. (PayPal:
 * `paypal/tests/unit/recordPaypalPaymentConcurrency.test.ts`.)
 *
 * The real bootstraps, services and Stripe webhook handler run on a scratch
 * database with every core migration; the Stripe events are signed with a
 * test secret, as Stripe signs them. Skips itself when no Postgres server is
 * reachable.
 */
jest.setTimeout(60000);

const ENDPOINT_SECRET = 'whsec_order_placed_test';

const scratch: ScratchDb | null = await openScratchDb(
  'evershop_order_placed_callers_scratch_test'
);
const describeDb = scratch ? describe : describe.skip;

describeDb('order_placed from each payment method (scratch DB)', () => {
  // Read while collecting a skipped suite too: no destructuring of null
  const db = scratch?.db as ScratchDb['db'];
  let codOrderPlaced: (order: Record<string, unknown>) => Promise<void>;
  let completeZeroCheckoutOrder: (orderId: number) => Promise<void>;
  let stripeWebhook: (request: any, response: any, next: any) => Promise<void>;

  beforeAll(async () => {
    // Read by the webhook through getSetting, which loads them once
    await db.query(
      `INSERT INTO setting (name, value, is_json)
       VALUES ('stripeSecretKey', 'sk_test_order_placed', false),
              ('stripeEndpointSecret', $1, false)`,
      [ENDPOINT_SECRET]
    );
    // The payment statuses (paid, cod_pending, stripe_captured, ...) and the
    // hook that recomputes the order status come from the bootstraps
    for (const module of ['oms', 'cod', 'stripe']) {
      const { default: bootstrap } = await import(
        `../../../${module}/bootstrap.js`
      );
      await bootstrap();
    }
    const { getHooks } = await import('../../../../lib/util/hookable.js');
    codOrderPlaced = (getHooks().afterHooks.get('createOrderFunc') ?? []).find(
      (h) => h.callback.name === 'EmitOrderPlacedEvent'
    )!.callback as typeof codOrderPlaced;
    ({ completeZeroCheckoutOrder } = await import(
      '../../../checkout/services/zeroCheckout.js'
    ));
    ({ default: stripeWebhook } = await import(
      '../../../stripe/api/stripeWebHook/[bodyJson]webhook.js'
    ));
  });

  afterAll(async () => {
    await scratch?.close();
  });

  const row = async (orderId: number) =>
    (await db.query(`SELECT * FROM "order" WHERE order_id = $1`, [orderId]))
      .rows[0];
  const count = async (sql: string, orderId: number) =>
    (await db.query(sql, [orderId])).rows[0].n as number;

  /** The event carries the order as it was committed */
  async function expectOnePlacedEvent(orderId: number, paymentStatus: string) {
    const events = await placedEvents(db, orderId);
    expect(events).toHaveLength(1);
    const committed = await row(orderId);
    expect(committed.placed_at).toBeInstanceOf(Date);
    expect(events[0]).toMatchObject({
      order_id: orderId,
      payment_status: paymentStatus,
      status: committed.status,
      shipment_status: committed.shipment_status
    });
    expect(new Date(events[0].placed_at).getTime()).toBe(
      committed.placed_at.getTime()
    );
  }

  describe('Cash on Delivery', () => {
    it('placed when created: the committed order, once', async () => {
      // As createOrderFunc commits it: saveOrder's hook moved it to
      // cod_pending, and the shipment status was recomputed
      const order = await createOrder(db, {
        payment_method: 'cod',
        payment_status: 'cod_pending',
        shipment_status: 'delivered'
      });
      // What the hook is handed: the insert result, still pending
      const insertResult = {
        ...order,
        insertId: order.order_id,
        payment_status: 'pending',
        shipment_status: 'pending'
      };
      await codOrderPlaced(insertResult);
      await codOrderPlaced(insertResult);
      await expectOnePlacedEvent(order.order_id, 'cod_pending');
      expect(await placedEvents(db, order.order_id)).toEqual([
        expect.objectContaining({ shipment_status: 'delivered' })
      ]);
    });

    it('another payment method: not placed', async () => {
      const order = await createOrder(db, { payment_method: 'stripe' });
      await codOrderPlaced({ ...order, insertId: order.order_id });
      expect((await row(order.order_id)).placed_at).toBeNull();
      expect(await placedEvents(db, order.order_id)).toEqual([]);
    });
  });

  describe('zero-total checkout', () => {
    it('paid and placed in one transaction', async () => {
      const order = await createOrder(db, { payment_method: 'zero_checkout' });
      await completeZeroCheckoutOrder(order.order_id);
      await expectOnePlacedEvent(order.order_id, 'paid');
      expect((await row(order.order_id)).payment_status).toBe('paid');
    });

    it('a failed event write keeps the order pending, with no paid line in its log', async () => {
      const order = await createOrder(db, { payment_method: 'zero_checkout' });
      const failing = await failOrderPlacedWrites(db);
      try {
        await expect(completeZeroCheckoutOrder(order.order_id)).rejects.toThrow(
          'event table unavailable'
        );
      } finally {
        await failing.off();
      }
      const after = await row(order.order_id);
      expect([after.payment_status, after.placed_at]).toEqual(['pending', null]);
      expect(
        await count(
          `SELECT count(*)::int AS n FROM order_activity
            WHERE order_activity_order_id = $1 AND comment LIKE 'Payment completed%'`,
          order.order_id
        )
      ).toBe(0);
    });
  });

  describe('Stripe webhook', () => {
    const stripe = new Stripe('sk_test_order_placed');

    /** Deliver one signed event, as Stripe does */
    async function deliver(type: string, intent: Record<string, unknown>) {
      const payload = JSON.stringify({
        id: `evt_${type}_${intent.id}`,
        object: 'event',
        type,
        data: { object: { object: 'payment_intent', ...intent } }
      });
      const reply: { status: number; body?: unknown } = { status: 200 };
      const response = {
        status(code: number) {
          reply.status = code;
          return response;
        },
        json(body: unknown) {
          reply.body = body;
        },
        send(body: unknown) {
          reply.body = body;
        }
      };
      await stripeWebhook(
        {
          headers: {
            'stripe-signature': stripe.webhooks.generateTestHeaderString({
              payload,
              secret: ENDPOINT_SECRET
            })
          },
          body: payload
        },
        response,
        () => undefined
      );
      return reply;
    }

    const stripeOrder = () =>
      createOrder(db, {
        payment_method: 'stripe',
        grand_total: 10,
        currency: 'USD'
      });
    const intentFor = (order: Record<string, any>, extra = {}) => ({
      id: `pi_${order.order_id}`,
      amount: 1000,
      currency: 'usd',
      capture_method: 'automatic',
      metadata: { order_id: order.uuid },
      ...extra
    });

    it('payment_intent.succeeded delivered twice at once, then again: one order_placed', async () => {
      const order = await stripeOrder();
      const intent = intentFor(order);
      const replies = await Promise.all([
        deliver('payment_intent.succeeded', intent),
        deliver('payment_intent.succeeded', intent)
      ]);
      replies.push(await deliver('payment_intent.succeeded', intent));
      expect(replies).toEqual(
        Array(3).fill({ status: 200, body: { received: true } })
      );
      await expectOnePlacedEvent(order.order_id, 'stripe_captured');
      expect(
        await count(
          `SELECT count(*)::int AS n FROM order_activity
            WHERE order_activity_order_id = $1 AND comment LIKE 'Payment captured%'`,
          order.order_id
        )
      ).toBe(1);
    });

    it('authorized, then captured: placed once, when authorized', async () => {
      const order = await stripeOrder();
      const intent = intentFor(order, { capture_method: 'manual' });
      await deliver('payment_intent.amount_capturable_updated', intent);
      await deliver('payment_intent.succeeded', intent);
      await expectOnePlacedEvent(order.order_id, 'stripe_authorized');
    });

    it('failed, then paid on a retry: placed when paid', async () => {
      const order = await stripeOrder();
      const intent = intentFor(order);
      await deliver('payment_intent.payment_failed', intent);
      expect((await row(order.order_id)).payment_status).toBe('stripe_failed');
      expect(await placedEvents(db, order.order_id)).toEqual([]);
      await deliver('payment_intent.succeeded', intent);
      await expectOnePlacedEvent(order.order_id, 'stripe_captured');
    });

    it('an amount that does not match the order: not placed', async () => {
      const order = await stripeOrder();
      const reply = await deliver(
        'payment_intent.succeeded',
        intentFor(order, { amount: 1 })
      );
      expect(reply).toEqual({ status: 200, body: { received: true } });
      expect((await row(order.order_id)).placed_at).toBeNull();
      expect(await placedEvents(db, order.order_id)).toEqual([]);
    });
  });
});

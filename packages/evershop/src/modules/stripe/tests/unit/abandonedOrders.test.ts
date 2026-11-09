process.env.ALLOW_CONFIG_MUTATIONS = 'true';
process.env.CART_RECOVERY_TOKEN_SECRET =
  'unit-test-cart-recovery-secret-at-least-32-chars';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createOrder,
  openScratchDb,
  placedEvents,
  type ScratchDb
} from '../../../oms/tests/unit/helpers/orderScratchDb.js';
// Type only (erased): the module itself is imported after the scratch DB is open
import type { UnpaidStripeOrder } from '../../services/reconcileAbandonedOrders.js';

/**
 * An order whose payment was abandoned, on a scratch database with every
 * core migration and the real oms and Stripe bootstraps; only Stripe itself
 * is faked:
 * - the payment step stores each PaymentIntent it creates;
 * - the job's queries: the unpaid Stripe orders it looks at;
 * - an abandoned order: its intents canceled at Stripe, then the order
 *   canceled (`order_canceled`) and its cart given back, unlinked from the old
 *   session, so the cart recovery link (`decideCartRecovery`) is ready again;
 * - a cart that still has a live order, or led to a sale, stays closed;
 * - a payment whose webhook was lost is recorded and the order placed, once.
 * Skips itself when no Postgres server is reachable.
 */
jest.setTimeout(60000);

const createdIntents: string[] = [];
jest.unstable_mockModule('stripe', () => ({
  default: class {
    paymentIntents = {
      create: async () => {
        const id = `pi_created_${createdIntents.length + 1}`;
        createdIntents.push(id);
        return { id, client_secret: `${id}_secret` };
      }
    };
  }
}));

const scratch: ScratchDb | null = await openScratchDb(
  'evershop_stripe_abandoned_scratch_test'
);
const describeDb = scratch ? describe : describe.skip;

describeDb('abandoned Stripe orders (scratch DB)', () => {
  const db = scratch?.db as ScratchDb['db'];
  let job: typeof import('../../services/reconcileAbandonedOrders.js');
  let recovery: typeof import('../../../checkout/services/cartRecovery.js');
  let signToken: (cartId: number) => string;
  let createPaymentIntent: (req: any, res: any, next: any) => Promise<void>;
  let cancelAbandonedOrder: typeof import('../../../oms/services/cancelAbandonedOrder.js')['cancelAbandonedOrder'];

  beforeAll(async () => {
    await db.query(
      `INSERT INTO setting (name, value, is_json)
       VALUES ('stripeSecretKey', 'sk_test_abandoned', false)`
    );
    for (const module of ['oms', 'stripe']) {
      const { default: bootstrap } = await import(
        `../../../${module}/bootstrap.js`
      );
      await bootstrap();
    }
    job = await import('../../services/reconcileAbandonedOrders.js');
    recovery = await import('../../../checkout/services/cartRecovery.js');
    ({ signCartRecoveryToken: signToken } = await import(
      '../../../checkout/services/cartRecoveryToken.js'
    ));
    ({ default: createPaymentIntent } = await import(
      '../../api/createPaymentIntent/createPaymentIntent.js'
    ));
    ({ cancelAbandonedOrder } = await import(
      '../../../oms/services/cancelAbandonedOrder.js'
    ));
  });

  afterAll(async () => {
    await scratch?.close();
  });

  let sequence = 0;
  /** A cart row, every required column filled from the real schema */
  async function insertCart(values: Record<string, unknown>) {
    const { rows: columns } = await db.query(
      `SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'cart'
          AND is_nullable = 'NO' AND column_default IS NULL AND is_identity = 'NO'`
    );
    const given: Record<string, unknown> = {};
    for (const c of columns) {
      given[c.column_name] = /int|numeric|double|real/.test(c.data_type)
        ? 0
        : c.data_type === 'boolean'
        ? false
        : /timestamp|date/.test(c.data_type)
        ? new Date()
        : `cart-${sequence}`;
    }
    Object.assign(given, values);
    const names = Object.keys(given);
    const { rows } = await db.query(
      `INSERT INTO cart (${names.map((n) => `"${n}"`).join(', ')})
       VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      names.map((n) => given[n])
    );
    return rows[0];
  }
  /** A cart closed by its order, as createOrder leaves it, and that order */
  async function abandonedCheckout(over: Record<string, unknown> = {}) {
    sequence += 1;
    const cart = await insertCart({
      sid: `session-${sequence}`,
      status: false,
      customer_email: `guest-${sequence}@shop.dev`,
      currency: 'USD',
      grand_total: 10
    });
    const order = await createOrder(db, {
      cart_id: cart.cart_id,
      payment_method: 'stripe',
      payment_status: 'pending',
      grand_total: 10,
      currency: 'USD',
      created_at: new Date(Date.now() - 2 * 3_600_000),
      ...over
    });
    return { cart, order: order as UnpaidStripeOrder & Record<string, any> };
  }
  const row = async (table: string, key: string, id: number) =>
    (await db.query(`SELECT * FROM "${table}" WHERE ${key} = $1`, [id]))
      .rows[0];

  /** The job's real database side; Stripe answers from `states` */
  function deps(states: Record<string, string>, canceled: string[] = []) {
    return {
      storedIntentIds: job.storedIntentIds,
      searchIntentIds: async () => [],
      retrieve: async (id: string) =>
        ({
          id,
          status: states[id],
          amount: 1000,
          currency: 'usd',
          capture_method: 'automatic_async',
          metadata: {}
        } as any),
      cancelIntent: async (id: string) => {
        canceled.push(id);
      },
      record: job.recordLostPayment,
      cancelAbandonedOrder,
      now: () => Date.now()
    };
  }

  it('the payment step stores every PaymentIntent it creates for the order', async () => {
    const { order } = await abandonedCheckout();
    const response = { status: () => response, json: () => response };
    await createPaymentIntent({ body: { order_id: order.uuid } }, response, () => {});
    await createPaymentIntent({ body: { order_id: order.uuid } }, response, () => {});
    expect(await job.storedIntentIds(order.order_id)).toEqual(
      createdIntents.slice(-2)
    );
  });

  it('looks at unpaid, uncanceled Stripe orders older than the wait, newest first', async () => {
    const { order: old } = await abandonedCheckout();
    const { order: newer } = await abandonedCheckout({
      created_at: new Date(Date.now() - 90 * 60_000)
    });
    const { order: young } = await abandonedCheckout({
      created_at: new Date()
    });
    const { order: failed } = await abandonedCheckout({
      payment_status: 'stripe_failed',
      created_at: new Date(Date.now() - 80 * 60_000)
    });
    const { order: paid } = await abandonedCheckout({
      payment_status: 'stripe_captured',
      placed_at: new Date()
    });
    const { order: cod } = await abandonedCheckout({ payment_method: 'cod' });
    const found = (
      await job.findUnpaidStripeOrders(new Date(Date.now() - 3_600_000))
    ).map((o) => o.order_id);
    expect(found).toEqual(expect.arrayContaining([old.order_id, newer.order_id, failed.order_id]));
    for (const id of [young.order_id, paid.order_id, cod.order_id]) {
      expect(found).not.toContain(id);
    }
    expect(found.indexOf(failed.order_id)).toBeLessThan(found.indexOf(old.order_id));
  });

  it('an abandoned order: intents canceled at Stripe, order canceled, cart given back unlinked, and its recovery link ready again', async () => {
    const { cart, order } = await abandonedCheckout();
    await db.query(
      `INSERT INTO stripe_payment_intent (order_id, payment_intent_id)
       VALUES ($1, 'pi_a1'), ($1, 'pi_a2')`,
      [order.order_id]
    );
    // Before: the link of a closed cart with an order is dead
    const token = signToken(cart.cart_id);
    expect(await recovery.decideCartRecovery(token, { sessionId: 'x' })).toEqual({
      action: 'invalid'
    });

    const canceled: string[] = [];
    const outcome = await job.reconcileStripeOrder(
      order,
      deps({ pi_a1: 'requires_action', pi_a2: 'requires_payment_method' }, canceled) as any
    );
    expect(outcome).toBe('canceled, cart given back');
    expect(canceled).toEqual(['pi_a1', 'pi_a2']);
    expect(await row('order', 'order_id', order.order_id)).toMatchObject({
      status: 'canceled',
      payment_status: 'canceled'
    });
    expect(await row('cart', 'cart_id', cart.cart_id)).toMatchObject({
      status: true,
      sid: null
    });
    const { rows: events } = await db.query(
      `SELECT data FROM event WHERE name = 'order_canceled' AND (data->>'orderId')::int = $1`,
      [order.order_id]
    );
    expect(events).toHaveLength(1);
    expect(await recovery.decideCartRecovery(token, { sessionId: 'x' })).toMatchObject({
      action: 'ready',
      cart: { cart_id: cart.cart_id }
    });
  });

  it('a processing payment (a bank debit on its way): nothing changes', async () => {
    const { cart, order } = await abandonedCheckout();
    await db.query(
      `INSERT INTO stripe_payment_intent (order_id, payment_intent_id) VALUES ($1, 'pi_p1')`,
      [order.order_id]
    );
    const canceled: string[] = [];
    expect(
      await job.reconcileStripeOrder(order, deps({ pi_p1: 'processing' }, canceled) as any)
    ).toBe('waiting (a payment is processing)');
    expect(canceled).toEqual([]);
    expect((await row('order', 'order_id', order.order_id)).payment_status).toBe('pending');
    expect((await row('cart', 'cart_id', cart.cart_id)).status).toBe(false);
  });

  it('a cart that still has a live order, or one that led to a sale, stays closed', async () => {
    const { cart, order } = await abandonedCheckout();
    await createOrder(db, { cart_id: cart.cart_id, payment_method: 'stripe' });
    expect(await cancelAbandonedOrder(order.uuid, 'test')).toEqual({ cartReopened: false });
    expect((await row('order', 'order_id', order.order_id)).status).toBe('canceled');
    expect((await row('cart', 'cart_id', cart.cart_id)).status).toBe(false);

    const sold = await abandonedCheckout();
    await createOrder(db, {
      cart_id: sold.cart.cart_id,
      payment_method: 'cod',
      status: 'canceled',
      placed_at: new Date()
    });
    expect(await cancelAbandonedOrder(sold.order.uuid, 'test')).toEqual({ cartReopened: false });
    expect((await row('cart', 'cart_id', sold.cart.cart_id)).status).toBe(false);
  });

  it('a payment whose webhook was lost: recorded and the order placed, once', async () => {
    const { cart, order } = await abandonedCheckout();
    await db.query(
      `INSERT INTO stripe_payment_intent (order_id, payment_intent_id) VALUES ($1, 'pi_s1')`,
      [order.order_id]
    );
    const d = deps({ pi_s1: 'succeeded' }) as any;
    expect(await job.reconcileStripeOrder(order, d)).toBe(
      'paid, the webhook was missed: capture recorded'
    );
    const placed = await row('order', 'order_id', order.order_id);
    expect(placed.payment_status).toBe('stripe_captured');
    expect(placed.placed_at).toBeInstanceOf(Date);
    expect(await placedEvents(db, order.order_id)).toHaveLength(1);
    // A second run (or the late webhook) changes nothing
    await job.recordLostPayment(order, await d.retrieve('pi_s1'), 'capture');
    expect(await placedEvents(db, order.order_id)).toHaveLength(1);
    expect((await row('cart', 'cart_id', cart.cart_id)).status).toBe(false);
    // An amount that does not match the order is never recorded
    const other = await abandonedCheckout({ grand_total: 99 });
    expect(
      await job.recordLostPayment(other.order, await d.retrieve('pi_x'), 'capture')
    ).toBe('mismatch');
    expect((await row('order', 'order_id', other.order.order_id)).payment_status).toBe('pending');
  });
});

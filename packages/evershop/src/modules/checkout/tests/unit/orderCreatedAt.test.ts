process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import { randomUUID } from 'crypto';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  openScratchDb,
  type ScratchDb
} from '../../../oms/tests/unit/helpers/orderScratchDb.js';

/**
 * An order is dated when it is placed. The real cart (`getCart`) exports its
 * own `created_at` and `updated_at` (when the shopper started the cart, when
 * it last changed), and saveOrder copied them into the order: an order placed
 * today from a cart started three days ago was dated three days ago, in the
 * admin, the reports, and the `order_created` event that webhooks send.
 *
 * Runs the real checkout (`createOrder`, every cart taken as valid) on a
 * scratch database with every core migration; skips itself when no Postgres
 * server is reachable.
 */
jest.setTimeout(60000);

// What a cart must hold to be ordered is not what this file is about
jest.unstable_mockModule('../../services/orderValidator.js', () => ({
  validateBeforeCreateOrder: async () => ({ valid: true, errors: [] }),
  // The checkout bootstrap adds the zero-checkout rule
  addOrderValidationRule: () => undefined
}));

const scratch: ScratchDb | null = await openScratchDb(
  'evershop_order_created_at_scratch_test'
);
const describeDb = scratch ? describe : describe.skip;

describeDb("an order's created_at (scratch DB)", () => {
  // Read while collecting a skipped suite too: no destructuring of null
  const db = scratch?.db as ScratchDb['db'];
  let getCart: (uuid: string) => Promise<{
    exportData: () => Record<string, unknown>;
  }>;
  let createOrder: (cart: unknown) => Promise<Record<string, any>>;

  /** A `cart` row, every required column filled from the real schema */
  async function insertCart(
    values: Record<string, unknown>
  ): Promise<Record<string, any>> {
    const { rows: columns } = await db.query(
      `SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'cart'
          AND is_nullable = 'NO' AND column_default IS NULL
          AND is_identity = 'NO'`
    );
    const given: Record<string, unknown> = {};
    columns.forEach(({ column_name: name, data_type: type }) => {
      given[name] = /int|numeric|double|real/.test(type)
        ? 1
        : type === 'boolean'
        ? false
        : /json/.test(type)
        ? '{}'
        : `on-${name}`;
    });
    Object.assign(given, values);
    const names = Object.keys(given);
    const { rows } = await db.query(
      `INSERT INTO cart (${names.map((n) => `"${n}"`).join(', ')})
       VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      names.map((n) => given[n])
    );
    return rows[0];
  }

  beforeAll(async () => {
    // Order statuses come from the oms bootstrap, the cart's fields from
    // checkout's and promotion's (the totals after discount)
    const { default: omsBootstrap } = await import('../../../oms/bootstrap.js');
    await omsBootstrap();
    const { default: checkoutBootstrap } = await import('../../bootstrap.js');
    await checkoutBootstrap();
    const { default: promotionBootstrap } = await import(
      '../../../promotion/bootstrap.js'
    );
    await promotionBootstrap();
    ({ getCart } = (await import('../../services/cart/Cart.js')) as unknown as {
      getCart: typeof getCart;
    });
    ({ createOrder } = (await import(
      '../../services/orderCreator.js'
    )) as unknown as { createOrder: typeof createOrder });
  });

  afterAll(async () => {
    await scratch?.close();
  });

  it('is the time the order is placed, not the time its cart was started', async () => {
    const {
      rows: [{ started, changed }]
    } = await db.query(
      `SELECT now() - interval '3 days' AS started,
              now() - interval '2 days' AS changed`
    );
    const uuid = randomUUID();
    await insertCart({
      uuid,
      status: true,
      currency: 'USD',
      customer_email: 'shopper@example.test',
      created_at: started,
      updated_at: changed
    });
    const cart = await getCart(uuid);
    // The real cart exports its own times: what saveOrder used to copy
    expect(cart.exportData()).toMatchObject({
      created_at: started,
      updated_at: changed
    });

    const {
      rows: [{ now: before }]
    } = await db.query('SELECT clock_timestamp() AS now');
    const order = await createOrder(cart);
    const {
      rows: [saved]
    } = await db.query(
      `SELECT created_at, updated_at, clock_timestamp() AS after
         FROM "order" WHERE order_id = $1`,
      [order.order_id]
    );

    [saved.created_at, saved.updated_at].forEach((time: Date) => {
      expect(time.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(time.getTime()).toBeLessThanOrEqual(saved.after.getTime());
    });
    // The webhook payload: the event the insert's trigger wrote
    const { rows: events } = await db.query(
      `SELECT data FROM event
        WHERE name = 'order_created' AND (data->>'order_id')::int = $1`,
      [order.order_id]
    );
    expect(events).toHaveLength(1);
    expect(new Date(events[0].data.created_at).getTime()).toBe(
      saved.created_at.getTime()
    );
  });
});

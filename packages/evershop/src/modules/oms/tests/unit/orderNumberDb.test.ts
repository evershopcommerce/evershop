process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach
} from '@jest/globals';
import {
  createOrder as insertRawOrder,
  openScratchDb,
  type ScratchDb
} from './helpers/orderScratchDb.js';

/**
 * Order numbers through the real checkout (`createOrder`, every cart taken as
 * valid) on a scratch database with every core migration:
 *
 * - orders placed at the same time get different numbers, 10000 plus their
 *   ids (the old rule, 10000 plus the highest id plus 1, gave most of them
 *   the same number and their checkouts failed on ORDER_NUMBER_UNIQUE);
 * - an `orderNumber` processor gets the order, its addresses, the cart and the
 *   order's own transaction, and the `order_created` event (written by a
 *   trigger on the insert) carries the processor's number;
 * - a processor that fails, whose SQL fails, or whose number another order
 *   has, never fails the checkout: the order gets the default number.
 *
 * Skips itself when no Postgres server is reachable.
 */
jest.setTimeout(60000);

const warnings: string[] = [];
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  debug: () => undefined,
  info: () => undefined,
  success: () => undefined,
  error: () => undefined,
  warning: (message: string) => {
    warnings.push(message);
  }
}));
// What a cart must hold to be ordered is not what this file is about
jest.unstable_mockModule(
  '../../../checkout/services/orderValidator.js',
  () => ({
    validateBeforeCreateOrder: async () => ({ valid: true, errors: [] })
  })
);

const scratch: ScratchDb | null = await openScratchDb(
  'evershop_order_number_scratch_test'
);
const describeDb = scratch ? describe : describe.skip;

type Format = (this: any, value: string) => unknown;
const keepNumber: Format = (value) => value;

describeDb('order numbers (scratch DB)', () => {
  // Read while collecting a skipped suite too: no destructuring of null
  const db = scratch?.db as ScratchDb['db'];
  let createOrder: (cart: unknown) => Promise<Record<string, any>>;
  let format: Format = keepNumber;
  let mail = 0;

  /** A row of `table`, every required column filled */
  async function insertRow(
    table: string,
    values: Record<string, unknown> = {}
  ): Promise<Record<string, any>> {
    const { rows: columns } = await db.query(
      `SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = $1
          AND is_nullable = 'NO' AND column_default IS NULL
          AND is_identity = 'NO'`,
      [table]
    );
    const given: Record<string, unknown> = {};
    columns.forEach(({ column_name: name, data_type: type }) => {
      given[name] = /int|numeric|double|real/.test(type)
        ? 1
        : type === 'boolean'
        ? false
        : /timestamp|date/.test(type)
        ? new Date()
        : /json/.test(type)
        ? '{}'
        : `on-${name}`;
    });
    Object.assign(given, values);
    const names = Object.keys(given);
    const { rows } = await db.query(
      `INSERT INTO "${table}" (${names.map((n) => `"${n}"`).join(', ')})
       VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      names.map((n) => given[n])
    );
    return rows[0];
  }

  // The order columns that saveOrder fills itself
  const SET_BY_SAVE_ORDER = [
    'uuid',
    'order_number',
    'status',
    'payment_status',
    'shipment_status',
    'shipping_address_id',
    'billing_address_id'
  ];

  /**
   * A cart as createOrder reads it: `getData`, `exportData` (the order's
   * required columns, as the real cart exports them) and `getItems`
   */
  async function cartOf(
    values: Record<string, unknown> = {},
    items: Array<{ export: () => Record<string, unknown> }> = []
  ) {
    const cart = await insertRow('cart', { currency: 'USD', status: true });
    const { rows: required } = await db.query(
      `SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'order'
          AND is_nullable = 'NO' AND column_default IS NULL
          AND is_identity = 'NO'`
    );
    const data: Record<string, unknown> = {};
    required
      .filter(({ column_name: name }) => !SET_BY_SAVE_ORDER.includes(name))
      .forEach(({ column_name: name, data_type: type }) => {
        data[name] = /int|numeric|double|real/.test(type) ? 1 : `on-${name}`;
      });
    Object.assign(data, {
      cart_id: cart.cart_id,
      currency: 'USD',
      customer_email: `on-${(mail += 1)}@example.test`,
      shipping_address_id: null,
      billing_address_id: null,
      ...values
    });
    return {
      getData: (key: string) => data[key],
      exportData: () => ({ ...data, items: [], errors: [] }),
      getItems: () => items
    };
  }

  const orderCreatedEvents = async (orderId: number) =>
    (
      await db.query(
        `SELECT data FROM event
          WHERE name = 'order_created' AND (data->>'order_id')::int = $1`,
        [orderId]
      )
    ).rows.map((row) => row.data);

  beforeAll(async () => {
    // The order statuses and their mapping come from the oms bootstrap
    const { default: bootstrap } = await import('../../bootstrap.js');
    await bootstrap();
    const { addProcessor } = await import('../../../../lib/util/registry.js');
    addProcessor('orderNumber', function (this: unknown, value: string) {
      return format.call(this, value);
    });
    ({ createOrder } = (await import(
      '../../../checkout/services/orderCreator.js'
    )) as unknown as { createOrder: typeof createOrder });
  });

  afterAll(async () => {
    await scratch?.close();
  });

  beforeEach(() => {
    format = keepNumber;
    warnings.length = 0;
  });

  it('gives orders placed at the same time different numbers: 10000 plus their ids', async () => {
    const carts = await Promise.all(Array.from({ length: 20 }, () => cartOf()));
    const results = await Promise.allSettled(
      carts.map((cart) => createOrder(cart))
    );

    expect(
      results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => String(r.reason))
    ).toEqual([]);
    const orders = results.map(
      (r) => (r as PromiseFulfilledResult<Record<string, any>>).value
    );
    expect(new Set(orders.map((o) => o.order_number)).size).toBe(20);
    orders.forEach((o) => {
      expect(o.order_number).toBe(String(10000 + o.order_id));
    });
  });

  it('gives a processor the order, its addresses, the cart and the transaction', async () => {
    const seen: Array<Record<string, unknown>> = [];
    format = function (value) {
      seen.push({
        value,
        order: this.order,
        shipping: this.shippingAddress,
        billing: this.billingAddress,
        source: this.source,
        cart: this.cart,
        inTransaction: this.connection.INTRANSACTION
      });
      return `${this.shippingAddress.country}-${value}`;
    };
    const ship = await insertRow('cart_address', { country: 'US' });
    const bill = await insertRow('cart_address', { country: 'DE' });
    const cart = await cartOf({
      shipping_address_id: ship.cart_address_id,
      billing_address_id: bill.cart_address_id
    });
    const order = await createOrder(cart);
    const number = `US-${10000 + order.order_id}`;

    expect(order.order_number).toBe(number);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      value: String(10000 + order.order_id),
      order: {
        order_id: order.order_id,
        order_number: String(10000 + order.order_id),
        currency: 'USD',
        customer_email: cart.getData('customer_email'),
        shipping_address_id: order.shipping_address_id
      },
      shipping: { country: 'US', order_address_id: order.shipping_address_id },
      billing: { country: 'DE', order_address_id: order.billing_address_id },
      source: 'checkout',
      inTransaction: true
    });
    expect(seen[0].cart).toBe(cart);
    expect(
      (seen[0].order as { created_at: unknown }).created_at
    ).toBeInstanceOf(Date);
    // Saved, and the event that the insert's trigger wrote carries it
    const { rows } = await db.query(
      'SELECT order_number FROM "order" WHERE order_id = $1',
      [order.order_id]
    );
    expect(rows[0].order_number).toBe(number);
    const events = await orderCreatedEvents(order.order_id);
    expect(events).toHaveLength(1);
    expect(events[0].order_number).toBe(number);
  });

  it('rolls back a counter kept with this.connection when the checkout fails', async () => {
    await db.query('CREATE TABLE on_counter (n int NOT NULL)');
    await db.query('INSERT INTO on_counter (n) VALUES (0)');
    format = async function () {
      const { rows } = await this.connection.query(
        'UPDATE on_counter SET n = n + 1 RETURNING n'
      );
      return `C-${rows[0].n}`;
    };
    // The order row is saved, then its item cannot be: the checkout fails
    const broken = await cartOf({}, [
      { export: () => ({ product_sku: null }) }
    ]);
    await expect(createOrder(broken)).rejects.toThrow();

    const order = await createOrder(await cartOf());
    expect(order.order_number).toBe('C-1');
    const { rows } = await db.query('SELECT n FROM on_counter');
    expect(rows[0].n).toBe(1);
  });

  it('saves the default number when a processor fails, its SQL included', async () => {
    format = async function () {
      await this.connection.query('SELECT * FROM on_no_such_table');
      return 'never';
    };
    const order = await createOrder(await cartOf());

    expect(order.order_number).toBe(String(10000 + order.order_id));
    expect(warnings.join('\n')).toMatch(
      /got the default number .*an orderNumber processor failed .*on_no_such_table/
    );
    // The transaction went on after the failed statement and committed
    const { rows } = await db.query(
      'SELECT order_number FROM "order" WHERE order_id = $1',
      [order.order_id]
    );
    expect(rows[0].order_number).toBe(order.order_number);
    expect(await orderCreatedEvents(order.order_id)).toHaveLength(1);
  });

  it('saves the default number when another order has the number a processor gives', async () => {
    await insertRawOrder(db, { order_number: 'ON-TAKEN' });
    format = () => 'ON-TAKEN';
    const order = await createOrder(await cartOf());

    expect(order.order_number).toBe(String(10000 + order.order_id));
    expect(warnings.join('\n')).toMatch(
      /"ON-TAKEN", which is already the number of another order/
    );
    const events = await orderCreatedEvents(order.order_id);
    expect(events.map((event) => event.order_number)).toEqual([
      order.order_number
    ]);
  });
});

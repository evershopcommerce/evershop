process.env.ALLOW_CONFIG_MUTATIONS = 'true';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import { openScratchDb, pointCoreAt } from '../helpers/scratchDb.js';

/**
 * G2: a historical order, written by core's real `importOrder` on the second
 * scratch database (a schema-only copy of core with no store running on it).
 *
 * What is proved here is what a mock could not: the real triggers of the real
 * tables. The stock and the event `order_created` are left alone when the
 * transaction says it is importing, the coupon's use is counted, and, as a
 * positive control, the same writes without the flag do take stock and write
 * the event — so the test fails if a trigger is missing and not only if the flag
 * works. Everything a test makes carries a marker (`HO-`, `ho-…@example.test`)
 * and is removed again.
 */
jest.setTimeout(60_000);

const db = await openScratchDb({ core: true });
if (db) pointCoreAt(db);
const describeDb = db ? describe : describe.skip;

const config = db ? (await import('config')).default : null;
const builder = db ? await import('@evershop/postgres-query-builder') : null;
const corePool = db
  ? (await import('../../../../../lib/postgres/connection.js')).pool
  : null;
const service = db
  ? await import('../../../../oms/services/importOrder.js')
  : null;
const guard = db
  ? (await import('../../../../checkout/migration/Version-1.0.13.js')).default
  : null;

const OMS = {
  order: {
    shipmentStatus: {
      shipped: { name: 'Shipped', badge: 'warning', phase: 'shipped' },
      delivered: { name: 'Delivered', badge: 'success', phase: 'delivered' },
      canceled: { name: 'Canceled', badge: 'destructive', phase: 'canceled' }
    },
    paymentStatus: {
      pending: { name: 'Pending', badge: 'default', isDefault: true },
      paid: { name: 'Paid', badge: 'success' },
      refunded: { name: 'Refunded', badge: 'destructive' },
      canceled: { name: 'Canceled', badge: 'destructive' }
    },
    status: {
      new: {
        name: 'New',
        badge: 'default',
        isDefault: true,
        next: ['processing', 'canceled']
      },
      processing: {
        name: 'Processing',
        badge: 'default',
        next: ['completed', 'canceled']
      },
      completed: { name: 'Completed', badge: 'success', next: ['closed'] },
      canceled: { name: 'Canceled', badge: 'destructive', next: [] },
      closed: { name: 'Closed', badge: 'outline', next: [] }
    },
    psoMapping: {
      'pending:pending': 'new',
      'pending:*': 'processing',
      'paid:pending': 'processing',
      'paid:shipped': 'processing',
      'paid:delivered': 'completed',
      'refunded:*': 'closed',
      'canceled:*': 'canceled'
    }
  }
};

const q = async (sql: string, params: unknown[] = []) =>
  (await db!.pool.query(sql, params)).rows;
const one = async (sql: string, params: unknown[] = []) =>
  (await q(sql, params))[0];
type Connection = Awaited<
  ReturnType<NonNullable<typeof builder>['getConnection']>
>;

/**
 * A connection of core's pool for a test that ends its transactions by hand: the
 * builder's own `commit` and `rollback` hand the connection back to the pool,
 * and these tests go on using it. Whatever the test left open is rolled back and
 * the builder's mark is cleared before the connection goes back.
 */
async function withConnection<T>(
  work: (connection: Connection) => Promise<T>
): Promise<T> {
  const connection = await builder!.getConnection(corePool!);
  try {
    return await work(connection);
  } finally {
    await connection.query('ROLLBACK').catch(() => {});
    connection.INTRANSACTION = false;
    connection.release();
  }
}

const count = async (table: string) =>
  Number((await one(`SELECT count(*)::int AS n FROM "${table}"`)).n);

/** The newest event before the seed: whatever is newer was made by a test and is removed. */
let eventFloor = 0;
/** The newest event after the seed: the tests look for what came after it. */
let eventBaseline = 0;
let productId = 0;

const newestEvent = async () =>
  Number((await one('SELECT COALESCE(max(event_id), 0) AS n FROM event')).n);

async function cleanUp(floor: number) {
  await q(`DELETE FROM "order" WHERE customer_email LIKE 'ho-%@example.test'`);
  await q(`DELETE FROM cart WHERE customer_email LIKE 'ho-%@example.test'`);
  await q(`DELETE FROM order_address WHERE recipient LIKE 'HO %'`);
  await q(`DELETE FROM product WHERE sku LIKE 'HO-%'`);
  await q(`DELETE FROM coupon WHERE coupon LIKE 'HO-%'`);
  // The first attribute group of a database is the default one, and a trigger
  // refuses to delete it; the scratch database has none of the store's own.
  await q(
    `DO $$ BEGIN
       ALTER TABLE attribute_group DISABLE TRIGGER USER;
       DELETE FROM attribute_group WHERE group_name = 'HO group';
       ALTER TABLE attribute_group ENABLE TRIGGER USER;
     END $$`
  );
  await q('DELETE FROM event WHERE event_id > $1', [floor]);
}

beforeAll(async () => {
  if (!db) return;
  config!.util.setModuleDefaults('oms', OMS);
  // The migration of the guard, for a scratch database made before it (idempotent).
  // The pool of the test puts its own schema first on the search_path, and the
  // functions belong to `public`: say so, or they are made in the wrong schema.
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL search_path TO public');
    await guard!(client as never);
    await client.query('COMMIT');
  } finally {
    client.release();
  }
});

beforeEach(async () => {
  // What a run that was cut short left behind (its events included, and the
  // events this clean-up makes itself).
  await cleanUp(await newestEvent());
  eventFloor = await newestEvent();
  const groupId = (
    await one(
      `INSERT INTO attribute_group (group_name) VALUES ('HO group') RETURNING attribute_group_id`
    )
  ).attribute_group_id;
  productId = (
    await one(
      `INSERT INTO product (sku, price, group_id) VALUES ('HO-1', 10, $1) RETURNING product_id`,
      [groupId]
    )
  ).product_id;
  await q(
    `INSERT INTO product_description (product_description_product_id, name, url_key)
     VALUES ($1, 'Historical product', 'ho-1')`,
    [productId]
  );
  await q(
    `INSERT INTO product_inventory (product_inventory_product_id, qty, manage_stock, stock_availability)
     VALUES ($1, 10, true, true)
     ON CONFLICT (product_inventory_product_id)
     DO UPDATE SET qty = 10, manage_stock = true, stock_availability = true`,
    [productId]
  );
  await q(
    `INSERT INTO coupon (coupon, description, discount_amount) VALUES ('HO-COUPON', 'a coupon', 5)`
  );
  // What the seed itself wrote to the queue is not what the tests look for.
  eventBaseline = await newestEvent();
});

afterEach(async () => {
  await cleanUp(eventFloor);
});

afterAll(async () => {
  await corePool?.end();
  await db?.close();
});

const stock = async () =>
  Number(
    (
      await one(
        'SELECT qty FROM product_inventory WHERE product_inventory_product_id = $1',
        [productId]
      )
    ).qty
  );
const events = async (name: string) =>
  Number(
    (
      await one(
        'SELECT count(*)::int AS n FROM event WHERE event_id > $1 AND name = $2',
        [eventBaseline, name]
      )
    ).n
  );

let mail = 0;
const order = (over: Record<string, unknown> = {}) => ({
  currency: 'USD',
  customer: {
    email: `ho-${(mail += 1)}@example.test`,
    fullName: 'Hist Orical'
  },
  items: [{ sku: 'HO-1', name: 'Historical product', qty: 3, price: 10 }],
  paymentStatus: 'pending',
  ...over
});

/**
 * The writes of a new order, with the flag off: a cart, an order and one line.
 * The caller rolls back, so nothing stays.
 */
async function writeLikeANewOrder(connection: {
  query: (
    sql: string,
    params?: unknown[]
  ) => Promise<{ rows: Array<Record<string, number>> }>;
}) {
  const cart = (
    await connection.query(
      `INSERT INTO cart (currency, sub_total, sub_total_incl_tax, sub_total_with_discount,
         sub_total_with_discount_incl_tax, total_qty, tax_amount, tax_amount_before_discount,
         shipping_tax_amount, grand_total)
       VALUES ('USD', 1, 1, 1, 1, 1, 0, 0, 0, 1) RETURNING cart_id`
    )
  ).rows[0].cart_id;
  const orderId = (
    await connection.query(
      `INSERT INTO "order" (order_number, status, cart_id, currency, sub_total, sub_total_incl_tax,
         sub_total_with_discount, sub_total_with_discount_incl_tax, total_qty, tax_amount,
         tax_amount_before_discount, shipping_tax_amount, grand_total)
       VALUES ('HO-RAW', 'new', $1, 'USD', 1, 1, 1, 1, 1, 0, 0, 0, 1) RETURNING order_id`,
      [cart]
    )
  ).rows[0].order_id;
  await connection.query(
    `INSERT INTO order_item (order_item_order_id, product_id, product_sku, product_name, product_price,
       product_price_incl_tax, qty, final_price, final_price_incl_tax, tax_percent, tax_amount,
       tax_amount_before_discount, discount_amount, line_total, line_total_with_discount,
       line_total_incl_tax, line_total_with_discount_incl_tax)
     VALUES ($1, $2, 'HO-1', 'raw', 10, 10, 2, 10, 10, 0, 0, 0, 0, 20, 20, 20, 20)`,
    [orderId, productId]
  );
}

describeDb('importOrder on the core scratch database', () => {
  it('writes the order, its lines, its addresses, its payments and its log, as given', async () => {
    const placed = new Date('2023-03-04T05:06:07.000Z');
    const imported = await service!.importOrder(
      order({
        createdAt: placed,
        coupon: null,
        items: [
          {
            sku: 'HO-1',
            name: 'Historical product',
            qty: 3,
            price: 10,
            taxPercent: 10,
            discountAmount: 6,
            weight: 2
          }
        ],
        shippingAddress: {
          recipient: 'HO Ship To',
          address_line_1: '1 Old Road',
          locality: 'Oldtown',
          postal_code: '12345',
          country: 'US',
          administrative_area: 'US-CA'
        },
        billingAddress: {
          recipient: 'HO Bill To',
          country: 'DE',
          locality: 'Berlin'
        },
        shipping: { methodName: 'Ground', feeExclTax: 5, feeInclTax: 5.5 },
        paymentMethod: 'stripe',
        paymentMethodName: 'Credit Card',
        paymentStatus: 'paid',
        shipmentStatus: 'shipped',
        transactions: [
          {
            transactionId: 'pi_1',
            type: 'online',
            amount: 29.9,
            paymentAction: 'capture',
            createdAt: '2023-03-04T05:10:00.000Z'
          }
        ],
        activity: [
          {
            comment: 'Shipped by the old system',
            createdAt: '2023-03-05T00:00:00.000Z'
          }
        ]
      }) as never
    );

    expect(imported).toMatchObject({
      status: 'processing',
      paymentStatus: 'paid',
      shipmentStatus: 'shipped'
    });
    const row = await one('SELECT * FROM "order" WHERE order_id = $1', [
      imported.orderId
    ]);
    expect(row).toMatchObject({
      order_number: imported.orderNumber,
      status: 'processing',
      payment_status: 'paid',
      shipment_status: 'shipped',
      currency: 'USD',
      payment_method: 'stripe',
      payment_method_name: 'Credit Card'
    });
    expect(row.created_at.toISOString()).toBe(placed.toISOString());
    // 3 x 10 = 30, less 6 = 24, plus 10% = 26.4, plus shipping 5.5 = 31.9
    expect(Number(row.sub_total)).toBe(30);
    expect(Number(row.discount_amount)).toBe(6);
    expect(Number(row.tax_amount)).toBe(2.4);
    expect(Number(row.grand_total)).toBe(31.9);
    expect(Number(row.total_qty)).toBe(3);
    expect(Number(row.total_weight)).toBe(6);

    const [line] = await q(
      'SELECT * FROM order_item WHERE order_item_order_id = $1',
      [imported.orderId]
    );
    expect(line).toMatchObject({
      product_id: productId,
      product_sku: 'HO-1',
      product_name: 'Historical product',
      qty: 3
    });
    expect(Number(line.line_total_with_discount_incl_tax)).toBe(26.4);
    expect(Number(line.final_price)).toBe(8);

    const ship = await one(
      'SELECT * FROM order_address WHERE order_address_id = $1',
      [row.shipping_address_id]
    );
    expect(ship).toMatchObject({
      recipient: 'HO Ship To',
      country: 'US',
      administrative_area: 'US-CA'
    });
    const bill = await one(
      'SELECT * FROM order_address WHERE order_address_id = $1',
      [row.billing_address_id]
    );
    expect(bill).toMatchObject({ recipient: 'HO Bill To', country: 'DE' });

    const payment = await one(
      'SELECT * FROM payment_transaction WHERE payment_transaction_order_id = $1',
      [imported.orderId]
    );
    expect(payment).toMatchObject({
      transaction_id: 'pi_1',
      payment_action: 'capture'
    });
    expect(Number(payment.amount)).toBe(29.9);
    expect(payment.created_at.toISOString()).toBe('2023-03-04T05:10:00.000Z');

    const log = await q(
      'SELECT comment, created_at FROM order_activity WHERE order_activity_order_id = $1 ORDER BY order_activity_id',
      [imported.orderId]
    );
    expect(log.map((l) => l.comment)).toEqual([
      'Order has been imported',
      'Shipped by the old system'
    ]);
    expect(log[1].created_at.toISOString()).toBe('2023-03-05T00:00:00.000Z');

    // The cart is a placeholder that is closed, and holds the same totals.
    const cart = await one(
      'SELECT status, grand_total FROM cart WHERE cart_id = $1',
      [row.cart_id]
    );
    expect(cart.status).toBe(false);
    expect(Number(cart.grand_total)).toBe(31.9);
  });

  it('does not take the stock again, and writes neither the event order_created nor an inventory event', async () => {
    await service!.importOrder(order() as never);
    expect(await stock()).toBe(10);
    expect(await events('order_created')).toBe(0);
    expect(await events('inventory_updated')).toBe(0);
    expect(await count('order')).toBe(1);
  });

  it('is the flag and nothing else that does it: the same writes without it take stock and write the event', async () => {
    await withConnection(async (connection) => {
      await connection.query('BEGIN');
      await writeLikeANewOrder(connection as never);
      const during = await connection.query(
        'SELECT qty FROM product_inventory WHERE product_inventory_product_id = $1',
        [productId]
      );
      expect(Number(during.rows[0].qty)).toBe(8);
      const created = await connection.query(
        `SELECT count(*)::int AS n FROM event WHERE event_id > $1 AND name = 'order_created'`,
        [eventBaseline]
      );
      expect(created.rows[0].n).toBe(1);
    });
    expect(await stock()).toBe(10);
  });

  it('keeps the flag for one transaction: the next transaction on the same connection takes stock again', async () => {
    await withConnection(async (connection) => {
      await builder!.startTransaction(connection);
      await service!.importOrder(order() as never, { connection });
      await connection.query('COMMIT');
      expect(await stock()).toBe(10);

      await connection.query('BEGIN');
      await writeLikeANewOrder(connection as never);
      const during = await connection.query(
        'SELECT qty FROM product_inventory WHERE product_inventory_product_id = $1',
        [productId]
      );
      expect(Number(during.rows[0].qty)).toBe(8);
      const flag = await connection.query(
        `SELECT current_setting('evershop.importing', true) AS flag`
      );
      expect(flag.rows[0].flag).not.toBe('on');
    });
  });

  it('counts the use of a coupon: an old use is a real use', async () => {
    await service!.importOrder(order({ coupon: 'HO-COUPON' }) as never);
    const coupon = await one(
      `SELECT used_time FROM coupon WHERE coupon = 'HO-COUPON'`
    );
    expect(Number(coupon.used_time)).toBe(1);
  });

  it.each([
    ['pending', 'pending', 'new'],
    ['pending', 'shipped', 'processing'],
    ['paid', 'delivered', 'completed'],
    ['refunded', 'delivered', 'closed'],
    ['canceled', 'pending', 'canceled']
  ])(
    'resolves the status of the order from payment %s and shipment %s: %s',
    async (paymentStatus, shipmentStatus, expected) => {
      const imported = await service!.importOrder(
        order({ paymentStatus, shipmentStatus }) as never
      );
      expect(imported.status).toBe(expected);
      expect(
        (
          await one('SELECT status FROM "order" WHERE order_id = $1', [
            imported.orderId
          ])
        ).status
      ).toBe(expected);
    }
  );

  it('takes a shipment of delivered for an order with nothing to ship, and pending otherwise', async () => {
    const digital = await service!.importOrder(
      order({
        paymentStatus: 'paid',
        items: [
          {
            sku: 'HO-1',
            name: 'Download',
            qty: 1,
            price: 10,
            noShippingRequired: true
          }
        ]
      }) as never
    );
    expect(digital).toMatchObject({
      shipmentStatus: 'delivered',
      status: 'completed'
    });
    const physical = await service!.importOrder(
      order({ paymentStatus: 'paid' }) as never
    );
    expect(physical).toMatchObject({
      shipmentStatus: 'pending',
      status: 'processing'
    });
  });

  it('numbers the order as the next one, or as given', async () => {
    const first = await service!.importOrder(order() as never);
    const second = await service!.importOrder(order() as never);
    // Core's own formula, as `orderCreator` has it: 10000, plus the id of the last order, plus 1.
    expect(Number(second.orderNumber)).toBe(10000 + first.orderId + 1);
    const given = await service!.importOrder(
      order({ orderNumber: 'HO-2019-0001' }) as never
    );
    expect(given.orderNumber).toBe('HO-2019-0001');
  });

  describe('when the data is not an order, nothing is written', () => {
    const nothing = async (data: unknown, message: RegExp) => {
      const before = [
        await count('order'),
        await count('cart'),
        await count('order_address')
      ];
      await expect(service!.importOrder(data as never)).rejects.toThrow(
        message
      );
      expect([
        await count('order'),
        await count('cart'),
        await count('order_address')
      ]).toEqual(before);
      expect(await stock()).toBe(10);
    };

    it('with no item', () =>
      nothing(order({ items: [] }), /at least one item/));
    it('with a quantity of zero', () =>
      nothing(
        order({ items: [{ sku: 'HO-1', name: 'x', qty: 0, price: 1 }] }),
        /whole number above 0/
      ));
    it('with a product the store does not have', () =>
      nothing(
        order({ items: [{ sku: 'HO-NONE', name: 'x', qty: 1, price: 1 }] }),
        /no product with the sku HO-NONE/
      ));
    it('with a payment status the store does not have', () =>
      nothing(
        order({ paymentStatus: 'nonsense' }),
        /Payment status is invalid/
      ));
    it('with a country nobody knows', () =>
      nothing(
        order({ billingAddress: { recipient: 'HO Nowhere', country: 'ZZ' } }),
        /known country/
      ));
    it('with no currency', () => nothing(order({ currency: '' }), /currency/));
  });

  it('writes nothing when a hook fails after everything was written (one transaction)', async () => {
    service!.hookAfterImportOrder(function failOnRequest(_result, data) {
      if ((data.metaData as { failAfter?: boolean } | undefined)?.failAfter) {
        throw new Error('stop after the writes');
      }
    });
    const before = [
      await count('order'),
      await count('order_item'),
      await count('cart')
    ];
    await expect(
      service!.importOrder(
        order({
          metaData: { failAfter: true },
          shippingAddress: { recipient: 'HO Late', country: 'US' }
        }) as never
      )
    ).rejects.toThrow('stop after the writes');
    expect([
      await count('order'),
      await count('order_item'),
      await count('cart')
    ]).toEqual(before);
    expect(await count('order_address')).toBe(0);
    // And an order whose hook does not fail goes through the same hook.
    await expect(service!.importOrder(order() as never)).resolves.toBeDefined();
  });

  it('calls the hooks before the writes, with the data', async () => {
    const seen: string[] = [];
    service!.hookBeforeImportOrder(function watch(data) {
      seen.push(`${data.currency}:${data.items.length}`);
    });
    await service!.importOrder(order() as never);
    expect(seen).toContain('USD:1');
  });

  it('refuses a connection that is not in a transaction: the flag would not last', async () => {
    await withConnection(async (connection) => {
      await expect(
        service!.importOrder(order() as never, { connection })
      ).rejects.toThrow(/in a transaction/);
    });
    expect(await count('order')).toBe(0);
  });

  it('joins the transaction of the caller, who can still roll it back', async () => {
    await withConnection(async (connection) => {
      await builder!.startTransaction(connection);
      await service!.importOrder(order() as never, { connection });
      expect(
        Number(
          (await connection.query(`SELECT count(*)::int AS n FROM "order"`))
            .rows[0].n
        )
      ).toBe(1);
      await connection.query('ROLLBACK');
    });
    expect(await count('order')).toBe(0);
    expect(await count('cart')).toBe(0);
    expect(await stock()).toBe(10);
  });
});

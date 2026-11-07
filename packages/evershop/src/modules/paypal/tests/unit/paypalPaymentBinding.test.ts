import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { Pool } from 'pg';

/**
 * A PayPal payment is only accepted for the PayPal order the store created
 * for the order, and for the amount the store asked for:
 * - The webhook found an order by its order number (the invoice id), so a
 *   PayPal order anyone created with the store's client id and our order
 *   number marked that order paid, for any amount.
 * - The browser holds the PayPal order id and can change the amount before
 *   approving; the return page captured whatever the PayPal order held.
 * - The capture-id lookup also picked up orders of other payment methods on
 *   the same PayPal app (Fastlane) and wrote paypal_* statuses over theirs.
 *
 * Real Postgres (all core migrations into a scratch database), the real
 * webhook handler and finalization, a stubbed PayPal API. Skips itself when
 * no Postgres server is reachable.
 */
jest.setTimeout(60000);

const SCRATCH_DB = 'evershop_paypal_binding_scratch_test';

function poolConfig(database: string) {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || undefined,
    password: process.env.DB_PASSWORD || undefined,
    database
  };
}

async function probeServer(): Promise<boolean> {
  const probe = new Pool({ ...poolConfig('postgres'), max: 1 });
  try {
    const version = await probe.query(
      `SELECT current_setting('server_version_num')::int AS v`
    );
    if (version.rows[0].v < 130000) {
      return false;
    }
    await probe.query(`DROP DATABASE IF EXISTS ${SCRATCH_DB} WITH (FORCE)`);
    await probe.query(`CREATE DATABASE ${SCRATCH_DB}`);
    return true;
  } catch {
    return false;
  } finally {
    await probe.end().catch(() => {});
  }
}

const serverAvailable = await probeServer();
const describeDb = serverAvailable ? describe : describe.skip;
if (!serverAvailable) {
  // eslint-disable-next-line no-console
  console.warn(
    'paypalPaymentBinding.test: no local Postgres reachable — DB-backed suite skipped'
  );
}

describeDb('a PayPal payment is bound to its order (scratch DB)', () => {
  const originalDbName = process.env.DB_NAME;
  let db: Pool;
  let corePool: { end: () => Promise<void> } | undefined;
  let handlePaypalWebhookEvent: typeof import('../../services/paypalWebhook.js')['handlePaypalWebhookEvent'];
  let finalizePaypalOrderOrFail: typeof import('../../services/finalizePaypalOrder.js')['finalizePaypalOrderOrFail'];

  /** A row with every required column filled from the real schema */
  async function insertRow(
    table: string,
    values: Record<string, unknown>
  ): Promise<Record<string, any>> {
    const { rows: columns } = await db.query(
      `SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = $1
          AND is_nullable = 'NO' AND column_default IS NULL
          AND is_identity = 'NO'`,
      [table]
    );
    const valueFor = (type: string) =>
      /int|numeric|double|real/.test(type)
        ? 10
        : type === 'boolean'
        ? false
        : /timestamp|date/.test(type)
        ? new Date()
        : /json/.test(type)
        ? '{}'
        : `test-${Math.random().toString(36).slice(2, 8)}`;
    const row: Record<string, unknown> = {};
    for (const c of columns) {
      row[c.column_name] = valueFor(c.data_type);
    }
    Object.assign(row, values);
    const names = Object.keys(row);
    const { rows } = await db.query(
      `INSERT INTO "${table}" (${names.map((n) => `"${n}"`).join(', ')})
       VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      names.map((n) => row[n])
    );
    return rows[0];
  }

  /** A pending 500.00 USD order */
  function createPendingOrder(values: Record<string, unknown> = {}) {
    return insertRow('order', {
      payment_status: 'pending',
      payment_method: 'paypal',
      currency: 'USD',
      grand_total: 500,
      integration_order_id: `PP-${Math.random().toString(36).slice(2, 10)}`,
      ...values
    });
  }

  async function reload(order: Record<string, any>) {
    return (
      await db.query(`SELECT * FROM "order" WHERE order_id = $1`, [
        order.order_id
      ])
    ).rows[0];
  }

  const count = async (sql: string, orderId: number) =>
    (await db.query(sql, [orderId])).rows[0].n;
  const transactions = (orderId: number) =>
    count(
      `SELECT count(*)::int AS n FROM payment_transaction WHERE payment_transaction_order_id = $1`,
      orderId
    );
  const placedEvents = (orderId: number) =>
    count(
      `SELECT count(*)::int AS n FROM event
        WHERE name = 'order_placed' AND (data->>'order_id')::int = $1`,
      orderId
    );

  function captureEvent(
    eventType: string,
    capture: { id: string; value: string; paypalOrderId?: string },
    invoiceId: string
  ) {
    return {
      event_type: eventType,
      resource: {
        id: capture.id,
        status:
          eventType === 'PAYMENT.CAPTURE.PENDING' ? 'PENDING' : 'COMPLETED',
        amount: { currency_code: 'USD', value: capture.value },
        invoice_id: invoiceId,
        supplementary_data: {
          related_ids: { order_id: capture.paypalOrderId }
        }
      }
    };
  }

  // The webhook paths under test never call PayPal
  const noPaypalCalls = {
    get: jest.fn(),
    post: jest.fn()
  } as any;

  beforeAll(async () => {
    process.env.DB_NAME = SCRATCH_DB;
    db = new Pool({ ...poolConfig(SCRATCH_DB), max: 2 });

    const { getCoreModules } = await import(
      '../../../../bin/lib/loadModules.js'
    );
    const { migrate } = await import(
      '../../../../bin/lib/bootstrap/migrate.js'
    );
    const connection = await db.connect();
    await startTransaction(connection);
    const exit = jest.spyOn(process, 'exit').mockImplementation(((
      code?: number
    ) => {
      throw new Error(`a core migration failed (process.exit ${code})`);
    }) as never);
    try {
      await migrate(getCoreModules(), connection as never);
      await commit(connection);
    } catch (e) {
      await rollback(connection);
      throw e;
    } finally {
      exit.mockRestore();
    }

    // PayPal's payment statuses (paypal_captured, ...) come from its bootstrap
    const { default: paypalBootstrap } = await import('../../bootstrap.js');
    await paypalBootstrap();

    ({ handlePaypalWebhookEvent } = await import(
      '../../services/paypalWebhook.js'
    ));
    ({ finalizePaypalOrderOrFail } = await import(
      '../../services/finalizePaypalOrder.js'
    ));
    corePool = (await import('../../../../lib/postgres/connection.js')).pool;
  });

  afterAll(async () => {
    await corePool?.end().catch(() => {});
    await db?.end();
    process.env.DB_NAME = originalDbName;
    const admin = new Pool({ ...poolConfig('postgres'), max: 1 });
    await admin
      .query(`DROP DATABASE IF EXISTS ${SCRATCH_DB} WITH (FORCE)`)
      .catch(() => {});
    await admin.end();
  });

  it('ignores a capture of another PayPal order that carries our order number', async () => {
    const order = await createPendingOrder();
    await handlePaypalWebhookEvent(
      captureEvent(
        'PAYMENT.CAPTURE.COMPLETED',
        { id: 'CAP-FOREIGN', value: '0.01', paypalOrderId: 'PP-SOMEONE-ELSE' },
        order.order_number
      ),
      noPaypalCalls
    );
    expect((await reload(order)).payment_status).toBe('pending');
    expect(await transactions(order.order_id)).toBe(0);
    expect(await placedEvents(order.order_id)).toBe(0);
  });

  it('does not mark paid a capture of our PayPal order for another amount', async () => {
    const order = await createPendingOrder();
    await handlePaypalWebhookEvent(
      captureEvent(
        'PAYMENT.CAPTURE.COMPLETED',
        {
          id: 'CAP-SHORT',
          value: '0.01',
          paypalOrderId: order.integration_order_id
        },
        order.order_number
      ),
      noPaypalCalls
    );
    expect((await reload(order)).payment_status).toBe('paypal_failed');
    expect(await transactions(order.order_id)).toBe(0);
    expect(await placedEvents(order.order_id)).toBe(0);
    expect(
      await count(
        `SELECT count(*)::int AS n FROM order_activity
          WHERE order_activity_order_id = $1 AND comment LIKE 'PayPal payment failed:%0.01 USD%'`,
        order.order_id
      )
    ).toBe(1);
  });

  it('records a capture of our PayPal order for the order amount', async () => {
    const order = await createPendingOrder();
    await handlePaypalWebhookEvent(
      captureEvent(
        'PAYMENT.CAPTURE.COMPLETED',
        {
          id: 'CAP-OK',
          value: '500.00',
          paypalOrderId: order.integration_order_id
        },
        order.order_number
      ),
      noPaypalCalls
    );
    expect((await reload(order)).payment_status).toBe('paypal_captured');
    expect(await transactions(order.order_id)).toBe(1);
    expect(await placedEvents(order.order_id)).toBe(1);
  });

  it('leaves a capture of another payment method on the same PayPal app alone', async () => {
    const order = await createPendingOrder({
      payment_method: 'paypal_fastlane',
      payment_status: 'pending',
      integration_order_id: null
    });
    await insertRow('payment_transaction', {
      payment_transaction_order_id: order.order_id,
      transaction_id: 'CAP-FASTLANE',
      amount: 500,
      payment_action: 'capture',
      transaction_type: 'online'
    });
    await handlePaypalWebhookEvent(
      captureEvent(
        'PAYMENT.CAPTURE.COMPLETED',
        {
          id: 'CAP-FASTLANE',
          value: '500.00',
          paypalOrderId: 'PP-FASTLANE'
        },
        order.order_number
      ),
      noPaypalCalls
    );
    expect((await reload(order)).payment_status).toBe('pending');
  });

  it('refuses a PayPal order whose amount was changed, before capturing it', async () => {
    const order = await createPendingOrder();
    const paypal = {
      get: jest.fn(async () => ({
        data: {
          id: order.integration_order_id,
          intent: 'CAPTURE',
          status: 'APPROVED',
          purchase_units: [{ amount: { currency_code: 'USD', value: '1.00' } }]
        }
      })),
      post: jest.fn()
    } as any;
    const result = await finalizePaypalOrderOrFail(order, paypal);
    expect(result.paymentStatus).toBe('paypal_failed');
    expect(paypal.post).not.toHaveBeenCalled();
    expect((await reload(order)).payment_status).toBe('paypal_failed');
    expect(await transactions(order.order_id)).toBe(0);
    expect(await placedEvents(order.order_id)).toBe(0);
  });

  it('captures a PayPal order for the order amount', async () => {
    const order = await createPendingOrder();
    const capture = {
      id: 'CAP-FINALIZE',
      status: 'COMPLETED',
      amount: { currency_code: 'USD', value: '500.00' }
    };
    const paypal = {
      get: jest.fn(async () => ({
        data: {
          id: order.integration_order_id,
          intent: 'CAPTURE',
          status: 'APPROVED',
          purchase_units: [
            { amount: { currency_code: 'USD', value: '500.00' } }
          ]
        }
      })),
      post: jest.fn(async () => ({
        status: 201,
        data: {
          status: 'COMPLETED',
          purchase_units: [{ payments: { captures: [capture] } }]
        }
      }))
    } as any;
    const result = await finalizePaypalOrderOrFail(order, paypal);
    expect(result.paymentStatus).toBe('paypal_captured');
    expect(paypal.post).toHaveBeenCalledTimes(1);
    expect(await transactions(order.order_id)).toBe(1);
    expect(await placedEvents(order.order_id)).toBe(1);
  });
});

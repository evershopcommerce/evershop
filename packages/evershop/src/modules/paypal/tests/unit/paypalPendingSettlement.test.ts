import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { Pool } from 'pg';

/**
 * A payment PayPal holds (`paypal_pending`: an eCheck, a review) used to leave
 * the order there for good unless a capture webhook came: the reconciliation
 * job only looked at `pending` orders, and a held authorization has no
 * webhook here at all, so a PayPal or Venmo order could be neither captured
 * nor canceled. The job now reads the held payment back from PayPal.
 *
 * Real Postgres (all core migrations into a scratch database), the real
 * recording path, a stubbed PayPal API. Skips itself when no Postgres server
 * is reachable.
 */
jest.setTimeout(60000);

const SCRATCH_DB = 'evershop_paypal_pending_scratch_test';

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
    'paypalPendingSettlement.test: no local Postgres reachable — DB-backed suite skipped'
  );
}

describeDb('held PayPal payments are settled by the reconciliation job (scratch DB)', () => {
  const originalDbName = process.env.DB_NAME;
  let db: Pool;
  let corePool: { end: () => Promise<void> } | undefined;
  let recordPaypalPayment: typeof import('../../services/finalizePaypalOrder.js')['recordPaypalPayment'];
  let settlePendingPaypalPayments: typeof import('../../services/reconcileAbandonedOrders.js')['settlePendingPaypalPayments'];

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

  /**
   * A 500.00 USD order whose payment PayPal held, recorded the way the return
   * page does it (so `order_placed` was emitted once).
   */
  async function createHeldOrder(
    action: 'capture' | 'authorize',
    paymentId: string,
    values: Record<string, unknown> = {}
  ) {
    const order = await insertRow('order', {
      payment_status: 'pending',
      payment_method: 'paypal',
      currency: 'USD',
      grand_total: 500,
      integration_order_id: `PP-${Math.random().toString(36).slice(2, 10)}`,
      ...values
    });
    await recordPaypalPayment(
      order,
      { id: paymentId, amount: { value: '500.00' } },
      {},
      action,
      'paypal_pending'
    );
    return reload(order);
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
  const placedEvents = (orderId: number) =>
    count(
      `SELECT count(*)::int AS n FROM event
        WHERE name = 'order_placed' AND (data->>'order_id')::int = $1`,
      orderId
    );
  const transactions = async (orderId: number) =>
    (
      await db.query(
        `SELECT transaction_id, payment_action FROM payment_transaction
          WHERE payment_transaction_order_id = $1 ORDER BY payment_transaction_id`,
        [orderId]
      )
    ).rows.map((r) => `${r.payment_action}:${r.transaction_id}`);

  /** A PayPal API that answers GETs from a path → body table */
  function paypal(answers: Record<string, any>) {
    return {
      get: jest.fn(async (path: string) => {
        if (!(path in answers)) {
          throw new Error(`unexpected PayPal call GET ${path}`);
        }
        return { status: 200, data: answers[path] };
      }),
      post: jest.fn(async () => {
        throw new Error('the job must not move money');
      })
    } as any;
  }
  const run = (api: any, ttlDays?: number) =>
    settlePendingPaypalPayments(async () => api, ttlDays);

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

    // PayPal's payment statuses (paypal_pending, ...) come from its bootstrap
    const { default: paypalBootstrap } = await import('../../bootstrap.js');
    await paypalBootstrap();

    ({ recordPaypalPayment } = await import(
      '../../services/finalizePaypalOrder.js'
    ));
    ({ settlePendingPaypalPayments } = await import(
      '../../services/reconcileAbandonedOrders.js'
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

  it('captures a held capture PayPal completed, without a second order_placed', async () => {
    const order = await createHeldOrder('capture', 'CAP-DONE');
    expect(order.payment_status).toBe('paypal_pending');
    expect(await placedEvents(order.order_id)).toBe(1);

    await run(
      paypal({
        '/v2/payments/captures/CAP-DONE': {
          id: 'CAP-DONE',
          status: 'COMPLETED',
          amount: { currency_code: 'USD', value: '500.00' }
        }
      })
    );
    expect((await reload(order)).payment_status).toBe('paypal_captured');
    expect(await transactions(order.order_id)).toEqual(['capture:CAP-DONE']);
    expect(await placedEvents(order.order_id)).toBe(1);
  });

  it('fails a held capture PayPal declined', async () => {
    const order = await createHeldOrder('capture', 'CAP-DECLINED');
    await run(
      paypal({
        '/v2/payments/captures/CAP-DECLINED': {
          id: 'CAP-DECLINED',
          status: 'DECLINED'
        }
      })
    );
    expect((await reload(order)).payment_status).toBe('paypal_failed');
  });

  it('makes a held authorization PayPal approved capturable', async () => {
    const order = await createHeldOrder('authorize', 'AUTH-OK');
    await run(
      paypal({
        '/v2/payments/authorizations/AUTH-OK': {
          id: 'AUTH-OK',
          status: 'CREATED',
          amount: { currency_code: 'USD', value: '500.00' }
        }
      })
    );
    expect((await reload(order)).payment_status).toBe('paypal_authorized');
    expect(await transactions(order.order_id)).toEqual(['authorize:AUTH-OK']);
    expect(await placedEvents(order.order_id)).toBe(1);
  });

  it('records the capture of a held authorization captured in the PayPal account', async () => {
    const order = await createHeldOrder('authorize', 'AUTH-CAPTURED');
    await run(
      paypal({
        '/v2/payments/authorizations/AUTH-CAPTURED': {
          id: 'AUTH-CAPTURED',
          status: 'CAPTURED'
        },
        [`/v2/checkout/orders/${order.integration_order_id}`]: {
          id: order.integration_order_id,
          status: 'COMPLETED',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: 'CAP-FROM-AUTH',
                    status: 'COMPLETED',
                    amount: { currency_code: 'USD', value: '500.00' }
                  }
                ]
              }
            }
          ]
        }
      })
    );
    expect((await reload(order)).payment_status).toBe('paypal_captured');
    expect(await transactions(order.order_id)).toEqual([
      'authorize:AUTH-CAPTURED',
      'capture:CAP-FROM-AUTH'
    ]);
    expect(await placedEvents(order.order_id)).toBe(1);
  });

  it('fails a held authorization PayPal denied', async () => {
    const order = await createHeldOrder('authorize', 'AUTH-DENIED');
    await run(
      paypal({
        '/v2/payments/authorizations/AUTH-DENIED': {
          id: 'AUTH-DENIED',
          status: 'DENIED'
        }
      })
    );
    expect((await reload(order)).payment_status).toBe('paypal_failed');
  });

  it('settles a held Venmo payment the same way', async () => {
    const order = await createHeldOrder('capture', 'CAP-VENMO', {
      payment_method: 'venmo'
    });
    await run(
      paypal({
        '/v2/payments/captures/CAP-VENMO': {
          id: 'CAP-VENMO',
          status: 'COMPLETED',
          amount: { currency_code: 'USD', value: '500.00' }
        }
      })
    );
    expect((await reload(order)).payment_status).toBe('paypal_captured');
  });

  it('leaves a payment PayPal still holds, then fails it past the TTL', async () => {
    const order = await createHeldOrder('capture', 'CAP-HELD');
    const api = paypal({
      '/v2/payments/captures/CAP-HELD': { id: 'CAP-HELD', status: 'PENDING' }
    });
    await run(api, 14);
    expect((await reload(order)).payment_status).toBe('paypal_pending');

    await db.query(
      `UPDATE "order" SET created_at = now() - interval '15 days' WHERE order_id = $1`,
      [order.order_id]
    );
    await run(api, 14);
    expect((await reload(order)).payment_status).toBe('paypal_failed');
    const { rows } = await db.query(
      `SELECT comment FROM order_activity WHERE order_activity_order_id = $1
        ORDER BY order_activity_id DESC LIMIT 1`,
      [order.order_id]
    );
    expect(rows[0].comment).toContain('still holds capture CAP-HELD after 14 days');
  });

  it('never moves money', async () => {
    const order = await createHeldOrder('capture', 'CAP-NOMONEY');
    const api = paypal({
      '/v2/payments/captures/CAP-NOMONEY': {
        id: 'CAP-NOMONEY',
        status: 'COMPLETED',
        amount: { currency_code: 'USD', value: '500.00' }
      }
    });
    await run(api);
    expect(api.post).not.toHaveBeenCalled();
    expect((await reload(order)).payment_status).toBe('paypal_captured');
  });
});

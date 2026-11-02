import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { Pool } from 'pg';

/**
 * #1180: the return page, the CHECKOUT.ORDER.APPROVED webhook and the
 * reconciliation cron can finalize the same PayPal order at the same time.
 * `recordPaypalPayment` decided "first finalization?" with a plain SELECT and
 * no lock, so every concurrent caller read "no transaction yet" and emitted
 * `order_placed` (one confirmation email each). It now locks the order row
 * first, and writes the event in its transaction.
 *
 * Runs on a real Postgres: all core migrations into a scratch database, the
 * real service, event emitter and payment status update. A hook holds each
 * caller just before it writes, until both have arrived or 500 ms pass, so
 * the old code always shows the race. With the lock, the second caller waits
 * at the lock instead, and the first goes on after the timeout. Skips itself
 * when no Postgres server is reachable (like recomputeStats.test.ts).
 */
jest.setTimeout(60000);

const SCRATCH_DB = 'evershop_paypal_race_scratch_test';

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
    'recordPaypalPaymentConcurrency.test: no local Postgres reachable — DB-backed suite skipped'
  );
}

describeDb(
  'recordPaypalPayment with concurrent callers (scratch DB, #1180)',
  () => {
    const originalDbName = process.env.DB_NAME;
    let db: Pool;
    let corePool: { end: () => Promise<void> } | undefined;
    let recordPaypalPayment: typeof import('../../services/finalizePaypalOrder.js')['recordPaypalPayment'];
    let arrived = 0;

    /** A pending order, every required column filled from the real schema */
    async function createPendingOrder(): Promise<Record<string, any>> {
      const { rows: columns } = await db.query(
        `SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'order'
          AND is_nullable = 'NO' AND column_default IS NULL
          AND is_identity = 'NO'`
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
      const names = columns.map((c) => `"${c.column_name}"`);
      const values = columns.map((c) => valueFor(c.data_type));
      const { rows } = await db.query(
        `INSERT INTO "order" (${[...names, '"payment_status"'].join(', ')})
       VALUES (${[...values, 'pending'].map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING *`,
        [...values, 'pending']
      );
      return rows[0];
    }

    beforeAll(async () => {
      // Core's own pool (used by the service) connects to DB_NAME when
      // lib/postgres/connection.js is first imported: point it at the scratch DB
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
        // migrate.js is JavaScript: its `connection = null` default reads as `null`
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

      // Hold each caller just before it writes, until both arrived or 500 ms
      const { hookBefore } = await import('../../../../lib/util/hookable.js');
      hookBefore('changePaymentStatus', async () => {
        arrived += 1;
        const until = Date.now() + 500;
        while (arrived < 2 && Date.now() < until) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      });

      ({ recordPaypalPayment } = await import(
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

    it('two callers at the same time: one order_placed, one transaction, one activity line', async () => {
      const order = await createPendingOrder();
      arrived = 0;
      const capture = { id: 'CAPTURE-1180', amount: { value: '10.00' } };
      const results = await Promise.all([
        recordPaypalPayment(
          order,
          capture,
          { status: 'COMPLETED' },
          'capture',
          'paypal_captured'
        ),
        recordPaypalPayment(
          order,
          capture,
          { status: 'COMPLETED' },
          'capture',
          'paypal_captured'
        )
      ]);

      expect(results.map((r) => r.firstFinalization).sort()).toEqual([
        false,
        true
      ]);
      const count = async (sql: string) =>
        (await db.query(sql, [order.order_id])).rows[0].n;
      expect(
        await count(
          `SELECT count(*)::int AS n FROM event
          WHERE name = 'order_placed' AND (data->>'order_id')::int = $1`
        )
      ).toBe(1);
      expect(
        await count(
          `SELECT count(*)::int AS n FROM payment_transaction WHERE payment_transaction_order_id = $1`
        )
      ).toBe(1);
      expect(
        await count(
          `SELECT count(*)::int AS n FROM order_activity
          WHERE order_activity_order_id = $1 AND comment LIKE 'Captured the payment%'`
        )
      ).toBe(1);
    });

    it('a failed order_placed write records nothing, so the next caller still sends it', async () => {
      // Make the event insert fail, as a database hiccup would
      await db.query(`CREATE TABLE fail_order_placed (on_off boolean)`);
      await db.query(`INSERT INTO fail_order_placed VALUES (true)`);
      await db.query(`CREATE FUNCTION fail_order_placed() RETURNS trigger AS $$
      BEGIN
        IF NEW.name = 'order_placed' AND (SELECT on_off FROM fail_order_placed) THEN
          RAISE EXCEPTION 'event table unavailable';
        END IF;
        RETURN NEW;
      END; $$ LANGUAGE plpgsql`);
      await db.query(`CREATE TRIGGER "FAIL_ORDER_PLACED" BEFORE INSERT ON event
      FOR EACH ROW EXECUTE PROCEDURE fail_order_placed()`);

      const order = await createPendingOrder();
      arrived = 1; // one caller at a time: do not wait for a second
      const capture = { id: 'CAPTURE-RETRY', amount: { value: '10.00' } };
      try {
        await expect(
          recordPaypalPayment(
            order,
            capture,
            { status: 'COMPLETED' },
            'capture',
            'paypal_captured'
          )
        ).rejects.toThrow('event table unavailable');

        // Nothing was kept: emitted after the commit, the payment was recorded
        // and every later caller skipped order_placed for good
        const { rows } = await db.query(
          `SELECT o.payment_status,
              (SELECT count(*)::int FROM payment_transaction t
                WHERE t.payment_transaction_order_id = o.order_id) AS transactions
         FROM "order" o WHERE o.order_id = $1`,
          [order.order_id]
        );
        expect(rows).toEqual([{ payment_status: 'pending', transactions: 0 }]);

        await db.query(`UPDATE fail_order_placed SET on_off = false`);
        const again = await recordPaypalPayment(
          order,
          capture,
          { status: 'COMPLETED' },
          'capture',
          'paypal_captured'
        );
        expect(again.firstFinalization).toBe(true);
        const { rows: events } = await db.query(
          `SELECT count(*)::int AS n FROM event
        WHERE name = 'order_placed' AND (data->>'order_id')::int = $1`,
          [order.order_id]
        );
        expect(events[0].n).toBe(1);
      } finally {
        // Never leave the failing switch on for the next test
        await db.query(`DROP TRIGGER IF EXISTS "FAIL_ORDER_PLACED" ON event`);
      }
    });

    it('the order_placed payload is the settled order, not the pending one', async () => {
      const order = await createPendingOrder();
      arrived = 1; // one caller: do not wait for a second
      await recordPaypalPayment(
        order,
        { id: 'CAPTURE-SETTLED', amount: { value: '10.00' } },
        { status: 'COMPLETED' },
        'capture',
        'paypal_captured'
      );
      const { rows } = await db.query(
        `SELECT data FROM event
        WHERE name = 'order_placed' AND (data->>'order_id')::int = $1`,
        [order.order_id]
      );
      const {
        rows: [saved]
      } = await db.query(`SELECT placed_at FROM "order" WHERE order_id = $1`, [
        order.order_id
      ]);
      expect(rows).toHaveLength(1);
      expect(rows[0].data.payment_status).toBe('paypal_captured');
      // markOrderPlaced set placed_at, and the event carries it
      expect(saved.placed_at).toBeInstanceOf(Date);
      expect(new Date(rows[0].data.placed_at).getTime()).toBe(
        saved.placed_at.getTime()
      );
    });

    it('authorized, then captured under a new id: one order_placed, when authorized', async () => {
      // Each payment is recorded (once per transaction id), but the order is
      // placed once: the guard per transaction id sent a second order_placed
      const order = await createPendingOrder();
      arrived = 1; // one caller at a time: do not wait for a second
      const authorized = await recordPaypalPayment(
        order,
        { id: 'AUTHORIZATION-1', amount: { value: '10.00' } },
        { status: 'CREATED' },
        'authorize',
        'paypal_authorized'
      );
      const captured = await recordPaypalPayment(
        order,
        { id: 'CAPTURE-AFTER-AUTHORIZATION', amount: { value: '10.00' } },
        { status: 'COMPLETED' },
        'capture',
        'paypal_captured'
      );
      expect([authorized.firstFinalization, captured.firstFinalization]).toEqual(
        [true, true]
      );
      const { rows } = await db.query(
        `SELECT data->>'payment_status' AS status FROM event
        WHERE name = 'order_placed' AND (data->>'order_id')::int = $1`,
        [order.order_id]
      );
      expect(rows).toEqual([{ status: 'paypal_authorized' }]);
      const { rows: payments } = await db.query(
        `SELECT
            (SELECT count(*)::int FROM payment_transaction
              WHERE payment_transaction_order_id = $1) AS transactions,
            (SELECT payment_status FROM "order" WHERE order_id = $1) AS status`,
        [order.order_id]
      );
      expect(payments).toEqual([
        { transactions: 2, status: 'paypal_captured' }
      ]);
    });
  }
);

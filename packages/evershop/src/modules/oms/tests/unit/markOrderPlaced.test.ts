import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  countPlacedEvents,
  createOrder,
  failOrderPlacedWrites,
  openScratchDb,
  placedEvents,
  type ScratchDb
} from './helpers/orderScratchDb.js';

/**
 * `markOrderPlaced(orderId, connection?)` is the one way to emit
 * `order_placed`: it sets `order.placed_at` and emits the event with the row
 * as it is then, once per order. COD, Stripe, PayPal and the zero-total
 * checkout each had their own guard (or none) and their own payload.
 *
 * The first part runs everywhere: no core code emits `order_placed` itself.
 * The second runs the real service on a scratch database with every core
 * migration, and skips itself when no Postgres server is reachable.
 */
jest.setTimeout(60000);

describe('who emits order_placed', () => {
  // The package's src folder (this test runs from dist/modules/oms/tests/unit)
  const SRC = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../../../src'
  );
  const EMITS = /emit\s*(<[^>]*>)?\(\s*['"`]order_placed['"`]/;

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return ['tests', 'node_modules'].includes(entry.name)
          ? []
          : sourceFiles(full);
      }
      return /\.(ts|tsx|js)$/.test(entry.name) ? [full] : [];
    });
  }

  it('the pattern catches each way of writing it', () => {
    for (const code of [
      "await emit('order_placed', { ...order });",
      'await emit("order_placed", order, connection);',
      "await emit<'order_placed'>(\n  'order_placed', order);",
      'emit(`order_placed`, data)'
    ]) {
      expect(EMITS.test(code)).toBe(true);
    }
    expect(EMITS.test("createSubscriber('order_placed', handler)")).toBe(false);
  });

  it('only markOrderPlaced does', () => {
    const files = sourceFiles(SRC);
    // Positive control: the scan reached the files that used to emit it
    for (const file of [
      'modules/oms/services/markOrderPlaced.ts',
      'modules/cod/bootstrap.ts',
      'modules/checkout/services/zeroCheckout.ts',
      'modules/stripe/api/stripeWebHook/[bodyJson]webhook.ts',
      'modules/paypal/services/finalizePaypalOrder.ts'
    ]) {
      expect(files).toContain(path.join(SRC, file));
    }
    expect(files.length).toBeGreaterThan(500);
    const emitters = files
      .filter((file) => EMITS.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC, file));
    expect(emitters).toEqual(['modules/oms/services/markOrderPlaced.ts']);
  });
});

const scratch: ScratchDb | null = await openScratchDb(
  'evershop_mark_placed_scratch_test'
);
const describeDb = scratch ? describe : describe.skip;

afterAll(async () => {
  await scratch?.close();
});

describeDb('markOrderPlaced (scratch DB)', () => {
  let markOrderPlaced: typeof import('../../services/markOrderPlaced.js')['markOrderPlaced'];
  let getConnection: () => Promise<any>;
  // Read while collecting a skipped suite too: no destructuring of null
  const db = scratch?.db as ScratchDb['db'];

  beforeAll(async () => {
    ({ markOrderPlaced } = await import('../../services/markOrderPlaced.js'));
    const { pool } = await import('../../../../lib/postgres/connection.js');
    getConnection = () => pool.connect();
  });

  /**
   * A transaction of the test's own. Rolled back when the test fails before
   * it ends it, so the order lock it holds never blocks the next test.
   */
  async function inTransaction<T>(
    run: (connection: any) => Promise<T>
  ): Promise<T> {
    const connection = await getConnection();
    await startTransaction(connection);
    try {
      return await run(connection);
    } finally {
      if (connection.INTRANSACTION) {
        await rollback(connection);
      }
    }
  }

  const placedAt = async (orderId: number) =>
    (
      await db.query(`SELECT placed_at FROM "order" WHERE order_id = $1`, [
        orderId
      ])
    ).rows[0].placed_at;

  it('marks the order placed and emits order_placed with the row as it is now', async () => {
    const order = await createOrder(db);
    const placed = await inTransaction(async (connection) => {
      // The payment status the caller set in the same transaction
      await connection.query(
        `UPDATE "order" SET payment_status = 'paid' WHERE order_id = $1`,
        [order.order_id]
      );
      const result = await markOrderPlaced(order.order_id, connection);
      // Nothing is visible before the caller commits
      expect(await placedEvents(db, order.order_id)).toEqual([]);
      expect(await placedAt(order.order_id)).toBeNull();
      await commit(connection);
      return result;
    });

    expect(placed).toMatchObject({
      order_id: order.order_id,
      payment_status: 'paid'
    });
    expect(placed!.placed_at).toBeInstanceOf(Date);
    const events = await placedEvents(db, order.order_id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      order_id: order.order_id,
      uuid: order.uuid,
      payment_status: 'paid'
    });
    expect(new Date(events[0].placed_at).getTime()).toBe(
      placed!.placed_at!.getTime()
    );
    expect((await placedAt(order.order_id)).getTime()).toBe(
      placed!.placed_at!.getTime()
    );
  });

  it('a second call changes nothing, emits nothing and returns null', async () => {
    const order = await createOrder(db);
    const first = await markOrderPlaced(order.order_id);
    const firstAt = await placedAt(order.order_id);
    expect(first).not.toBeNull();
    const before = await countPlacedEvents(db);
    expect(await markOrderPlaced(order.order_id)).toBeNull();
    await inTransaction(async (connection) => {
      expect(await markOrderPlaced(order.order_id, connection)).toBeNull();
      await commit(connection);
    });
    // No event at all, not even one with an empty payload
    expect(await countPlacedEvents(db)).toBe(before);
    expect(await placedEvents(db, order.order_id)).toHaveLength(1);
    expect((await placedAt(order.order_id)).getTime()).toBe(firstAt.getTime());
  });

  it('a caller that comes while another holds the order waits, then emits nothing', async () => {
    const order = await createOrder(db);
    const { second } = await inTransaction(async (first) => {
      expect(await markOrderPlaced(order.order_id, first)).not.toBeNull();
      // A second caller at the same time, in its own transaction
      let settled = false;
      const pending = markOrderPlaced(order.order_id).then((result) => {
        settled = true;
        return result;
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(settled).toBe(false); // waiting for the row lock
      await commit(first);
      return { second: pending };
    });
    expect(await second).toBeNull();
    expect(await placedEvents(db, order.order_id)).toHaveLength(1);
  });

  it('when the first caller rolls back, the waiting one places the order', async () => {
    const order = await createOrder(db);
    const { second } = await inTransaction(async (first) => {
      await markOrderPlaced(order.order_id, first);
      const pending = markOrderPlaced(order.order_id);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await rollback(first);
      return { second: pending };
    });
    expect(await second).toMatchObject({ order_id: order.order_id });
    expect(await placedEvents(db, order.order_id)).toHaveLength(1);
  });

  it('many callers at once: one order_placed', async () => {
    const order = await createOrder(db);
    const results = await Promise.all(
      Array.from({ length: 6 }, () => markOrderPlaced(order.order_id))
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await placedEvents(db, order.order_id)).toHaveLength(1);
  });

  it('a failed event write leaves the order unplaced, so the next call still sends it', async () => {
    const order = await createOrder(db);
    const failing = await failOrderPlacedWrites(db);
    try {
      await expect(markOrderPlaced(order.order_id)).rejects.toThrow(
        'event table unavailable'
      );
      // Given a pool, it runs its own transaction too
      await expect(
        markOrderPlaced(order.order_id, scratch!.corePool as any)
      ).rejects.toThrow('event table unavailable');
      expect(await placedAt(order.order_id)).toBeNull();
    } finally {
      await failing.off();
    }
    expect(await markOrderPlaced(order.order_id)).not.toBeNull();
    expect(await placedEvents(db, order.order_id)).toHaveLength(1);
  });

  it("the caller's rollback undoes both", async () => {
    const order = await createOrder(db);
    await inTransaction(async (connection) => {
      await markOrderPlaced(order.order_id, connection);
      await rollback(connection);
    });
    expect(await placedAt(order.order_id)).toBeNull();
    expect(await placedEvents(db, order.order_id)).toEqual([]);
  });

  it('refuses a connection that startTransaction did not open', async () => {
    const order = await createOrder(db);
    const before = await countPlacedEvents(db);
    const connection = await getConnection();
    try {
      await expect(
        markOrderPlaced(order.order_id, connection)
      ).rejects.toThrow('not in a transaction');
    } finally {
      connection.release();
    }
    expect(await placedAt(order.order_id)).toBeNull();
    expect(await countPlacedEvents(db)).toBe(before);
  });

  it('an order that does not exist: null, no event', async () => {
    const before = await countPlacedEvents(db);
    expect(await markOrderPlaced(987654)).toBeNull();
    expect(await countPlacedEvents(db)).toBe(before);
  });
});

describeDb('oms migration 1.0.11: orders placed before it', () => {
  // Read while collecting a skipped suite too: no destructuring of null
  const db = scratch?.db as ScratchDb['db'];

  it('get their creation time, their updated_at kept; orders never paid stay unplaced', async () => {
    const createdAt = new Date('2026-01-02T03:04:05Z');
    const updatedAt = new Date('2026-02-03T04:05:06Z');
    const cases: Array<[string, string, boolean, boolean]> = [
      // payment status, payment method, has a payment transaction, placed
      ['pending', 'stripe', false, false],
      ['canceled', 'stripe', false, false], // canceled before any payment
      ['stripe_failed', 'stripe', false, false], // may still succeed later
      ['canceled', 'cod', true, true], // a COD order canceled later
      ['canceled', 'cod', false, true], // the same, before COD recorded one
      ['paypal_failed', 'paypal', true, true], // went pending, then failed
      ['cod_pending', 'cod', true, true],
      ['paid', 'zero_checkout', false, true],
      ['stripe_captured', 'stripe', true, true],
      ['paypal_pending', 'paypal', true, true],
      ['stripe_refunded', 'stripe', true, true],
      ['authorize_dot_net_authorized', 'authorize_dot_net', true, true]
    ];
    const ids: number[] = [];
    for (const [status, method, hasTransaction] of cases) {
      const order = await createOrder(db, {
        payment_status: status,
        payment_method: method,
        created_at: createdAt,
        updated_at: updatedAt
      });
      ids.push(order.order_id);
      if (hasTransaction) {
        await db.query(
          `INSERT INTO payment_transaction
             (payment_transaction_order_id, transaction_id, amount, transaction_type, payment_action)
           VALUES ($1, $2, 10, 'online', 'capture')`,
          [order.order_id, `txn-${order.order_id}`]
        );
      }
    }
    // One placed already keeps its time
    const earlier = new Date('2026-03-04T05:06:07Z');
    const kept = await createOrder(db, {
      payment_status: 'paid',
      created_at: createdAt,
      updated_at: updatedAt,
      placed_at: earlier
    });

    const { default: migration } = await import(
      '../../migration/Version-1.0.11.js'
    );
    // As the migration runner runs it, in a transaction; then again, outside
    // one: it runs twice without harm
    const inTx = await db.connect();
    await startTransaction(inTx);
    try {
      await migration(inTx as never);
      await commit(inTx);
    } catch (e) {
      await rollback(inTx);
      throw e;
    }
    const plain = await db.connect();
    try {
      await migration(plain as never);
    } finally {
      plain.release();
    }

    const { rows } = await db.query(
      `SELECT order_id, placed_at, updated_at FROM "order"
        WHERE order_id = ANY($1::int[])`,
      [[...ids, kept.order_id]]
    );
    const byId = new Map(rows.map((row) => [row.order_id, row]));
    cases.forEach(([status, method, , placed], i) => {
      const value = byId.get(ids[i]).placed_at;
      expect([status, method, value && value.getTime()]).toEqual([
        status,
        method,
        placed ? createdAt.getTime() : null
      ]);
    });
    expect(byId.get(kept.order_id).placed_at.getTime()).toBe(earlier.getTime());
    // The backfill did not touch updated_at ...
    rows.forEach((row) => {
      expect([row.order_id, row.updated_at.getTime()]).toEqual([
        row.order_id,
        updatedAt.getTime()
      ]);
    });
    // ... and the SET_UPDATED_AT trigger is on again: an ordinary update
    // still sets it (which also shows the trigger exists here)
    await db.query(`UPDATE "order" SET status = status WHERE order_id = $1`, [
      ids[0]
    ]);
    const { rows: touched } = await db.query(
      `SELECT updated_at FROM "order" WHERE order_id = $1`,
      [ids[0]]
    );
    expect(touched[0].updated_at.getTime()).toBeGreaterThan(
      updatedAt.getTime()
    );

    // importOrder places an order that already happened by the same rule
    const { wasOrderPlaced } = await import('../../services/importOrder.js');
    cases.forEach(([status, method, hasTransaction, placed]) => {
      expect([
        status,
        method,
        hasTransaction,
        wasOrderPlaced(status, hasTransaction ? 1 : 0, method)
      ]).toEqual([status, method, hasTransaction, placed]);
    });
  });
});

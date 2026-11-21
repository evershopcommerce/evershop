import { readFileSync } from 'node:fs';
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { Pool } from 'pg';
import { getAjv } from '../../../base/services/getAjv.js';

/**
 * `POST /api/carts/:cart_id/contacts` (spec C2): the checkout saves a guest's
 * email to the cart as soon as it is entered.
 *
 * - The payload schema refuses anything that is not an email.
 * - The handler writes the one column, and only while the cart is active. It
 *   used to load the cart and save it back (`saveCart`), which writes every
 *   column, `status` included (its resolver always gives 1). The checkout
 *   sends this request when the shopper leaves the email field, so a click
 *   on "Place order" from there starts it just before the order: a save that
 *   read the cart before the order was placed and wrote after it made the
 *   ordered cart active again.
 * - The cart's `updated_at` moves (its trigger, `lib/postgres/updatedAtTrigger.ts`),
 *   so a job can find carts that have an email and went idle.
 *
 * The handler runs on a real Postgres: all core migrations into a scratch
 * database. Skips itself when no Postgres server is reachable (like
 * recordPaypalPaymentConcurrency.test.ts).
 */
jest.setTimeout(60000);

describe('the contact payload schema', () => {
  const schema = JSON.parse(
    readFileSync(
      new URL('../../api/addCartContactInfo/payloadSchema.json', import.meta.url),
      'utf8'
    )
  );
  const validate = getAjv().compile(schema);

  it('accepts an email', () => {
    expect(validate({ email: 'jane@example.com' })).toBe(true);
    expect(validate({ email: 'jane.doe+shop@mail.example.co.uk' })).toBe(true);
  });

  it.each([
    [{ email: 'jane' }],
    [{ email: 'jane@' }],
    [{ email: '@example.com' }],
    [{ email: 'jane doe@example.com' }],
    [{ email: ' jane@example.com' }],
    [{ email: '' }],
    [{ email: 42 }],
    [{ email: null }],
    [{}]
  ])('refuses %j', (payload) => {
    expect(validate(payload)).toBe(false);
  });
});

const SCRATCH_DB = 'evershop_contact_info_scratch_test';

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
    'saveContactInfo.test: no local Postgres reachable — DB-backed suite skipped'
  );
}

describeDb('saving the contact email on a cart (scratch DB)', () => {
  const originalDbName = process.env.DB_NAME;
  let db: Pool;
  let corePool: { end: () => Promise<void> } | undefined;
  let handler: (request: unknown, response: unknown, next: () => void) => Promise<void>;

  /**
   * A cart, every required column filled from the real schema. `updated_at`
   * is in the past, so a test sees it move.
   */
  async function createCart(status = true): Promise<Record<string, any>> {
    const { rows: columns } = await db.query(
      `SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'cart'
        AND is_nullable = 'NO' AND column_default IS NULL
        AND is_identity = 'NO' AND column_name <> 'status'`
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
        : type === 'uuid'
        ? crypto.randomUUID()
        : `test-${Math.random().toString(36).slice(2, 8)}`;
    const names = [...columns.map((c) => `"${c.column_name}"`), '"status"', '"updated_at"'];
    const values = [...columns.map((c) => valueFor(c.data_type)), status, LAST_WEEK];
    const { rows } = await db.query(
      `INSERT INTO "cart" (${names.join(', ')})
      VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})
      RETURNING *`,
      values
    );
    return rows[0];
  }

  const LAST_WEEK = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const readCart = async (uuid: string) =>
    (await db.query(`SELECT * FROM "cart" WHERE "uuid" = $1`, [uuid])).rows[0];

  async function call(cartId: string, email: string) {
    const response: any = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.jsonBody = payload;
        return this;
      }
    };
    let nextCalled = false;
    await handler({ params: { cart_id: cartId }, body: { email } }, response, () => {
      nextCalled = true;
    });
    return { ...response, nextCalled };
  }

  beforeAll(async () => {
    // Core's pool (used by the handler) connects to DB_NAME when
    // lib/postgres/connection.js is first imported: point it at the scratch DB
    process.env.DB_NAME = SCRATCH_DB;
    db = new Pool({ ...poolConfig(SCRATCH_DB), max: 2 });

    const { getCoreModules } = await import('../../../../bin/lib/loadModules.js');
    const { migrate } = await import('../../../../bin/lib/bootstrap/migrate.js');
    const connection = await db.connect();
    await startTransaction(connection);
    const exit = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
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

    handler = (await import('../../api/addCartContactInfo/saveContactInfo.js')).default;
    corePool = (await import('../../../../lib/postgres/connection.js')).pool;
  });

  afterAll(async () => {
    await corePool?.end().catch(() => {});
    await db?.end();
    process.env.DB_NAME = originalDbName;
    const admin = new Pool({ ...poolConfig('postgres'), max: 1 });
    await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH_DB} WITH (FORCE)`).catch(() => {});
    await admin.end();
  });

  it('an active cart: the email is saved, updated_at moves, nothing else changes', async () => {
    const cart = await createCart();
    const response = await call(cart.uuid, 'jane@example.com');

    expect(response.statusCode).toBe(200);
    expect(response.$body).toEqual({ data: { email: 'jane@example.com' } });
    expect(response.nextCalled).toBe(true);
    const after = await readCart(cart.uuid);
    expect(after).toEqual({
      ...cart,
      customer_email: 'jane@example.com',
      updated_at: expect.any(Date)
    });
    expect(after.updated_at.getTime()).toBeGreaterThan(Date.now() - 60 * 1000);
  });

  it('a cart whose order was placed: 404, and it stays inactive', async () => {
    const cart = await createCart(false);
    const response = await call(cart.uuid, 'jane@example.com');

    expect(response.statusCode).toBe(404);
    expect(response.jsonBody.error.status).toBe(404);
    expect(await readCart(cart.uuid)).toEqual(cart);
  });

  it('an unknown or malformed id: 404', async () => {
    expect((await call(crypto.randomUUID(), 'jane@example.com')).statusCode).toBe(404);
    expect((await call('not-a-uuid', 'jane@example.com')).statusCode).toBe(404);
  });

  it('the order is placed while the email is saved: the cart stays inactive', async () => {
    const cart = await createCart();
    // The order placement holds the cart row until it commits (orderCreator's
    // disableCart runs in the order's transaction)
    const order = await db.connect();
    try {
      await order.query('BEGIN');
      await order.query(`UPDATE "cart" SET "status" = FALSE WHERE "uuid" = $1`, [cart.uuid]);

      let settled = false;
      const pending = call(cart.uuid, 'late@example.com').finally(() => {
        settled = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(settled).toBe(false);

      await order.query('COMMIT');
      const response = await pending;
      expect(response.statusCode).toBe(404);
    } finally {
      order.release();
    }
    const after = await readCart(cart.uuid);
    expect(after.status).toBe(false);
    expect(after.customer_email).toBe(cart.customer_email);
  });
});

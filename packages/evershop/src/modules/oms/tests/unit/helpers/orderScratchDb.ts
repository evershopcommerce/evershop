import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { jest } from '@jest/globals';
import { Pool } from 'pg';

/**
 * A scratch database with every core migration, for the order-placement
 * tests, as in `paypal/tests/unit/recordPaypalPaymentConcurrency.test.ts`.
 *
 * Use: `openScratchDb(name)` at the top of the test file, BEFORE anything
 * imports `lib/postgres/connection.js` (core's pool reads `DB_NAME` when it
 * is first imported), so import core modules dynamically after it.
 */
function poolConfig(database: string) {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || undefined,
    password: process.env.DB_PASSWORD || undefined,
    database
  };
}

export interface ScratchDb {
  name: string;
  /** A pool of the test's own, on the scratch database */
  db: Pool;
  /** Core's pool; checked to point at the scratch database */
  corePool: Pool;
  close(): Promise<void>;
}

/**
 * Create the database, point core's pool at it and run the core migrations.
 * Returns `null`, after a warning, when no Postgres 13+ server is reachable.
 */
export async function openScratchDb(name: string): Promise<ScratchDb | null> {
  if (!/^evershop_\w+_scratch_test$/.test(name)) {
    throw new Error(`${name} does not look like a scratch database name`);
  }
  const probe = new Pool({ ...poolConfig('postgres'), max: 1 });
  try {
    const version = await probe.query(
      `SELECT current_setting('server_version_num')::int AS v`
    );
    if (version.rows[0].v < 130000) {
      throw new Error('Postgres 13 or later is needed');
    }
    await probe.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await probe.query(`CREATE DATABASE ${name}`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`${name}: no local Postgres reachable, DB suite skipped`);
    return null;
  } finally {
    await probe.end().catch(() => {});
  }

  const originalDbName = process.env.DB_NAME;
  const originalLockTimeout = process.env.DB_LOCK_TIMEOUT_MS;
  process.env.DB_NAME = name;
  // A test that leaves a lock behind fails in 5 s instead of hanging: core's
  // pool reads it once, when connection.js is first imported (just below)
  process.env.DB_LOCK_TIMEOUT_MS = '5000';
  const db = new Pool({ ...poolConfig(name), max: 4 });
  const { pool: corePool } = await import(
    '../../../../../lib/postgres/connection.js'
  );
  // Never run against another database (the dev store's included)
  if ((corePool as any).options.database !== name) {
    await db.end();
    throw new Error(
      `core's pool points at ${(corePool as any).options.database}, not ${name}`
    );
  }

  const { getCoreModules } = await import(
    '../../../../../bin/lib/loadModules.js'
  );
  const { migrate } = await import(
    '../../../../../bin/lib/bootstrap/migrate.js'
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

  return {
    name,
    db,
    corePool: corePool as unknown as Pool,
    async close() {
      await (corePool as unknown as Pool).end().catch(() => {});
      await db.end().catch(() => {});
      process.env.DB_NAME = originalDbName;
      if (originalLockTimeout === undefined) {
        delete process.env.DB_LOCK_TIMEOUT_MS;
      } else {
        process.env.DB_LOCK_TIMEOUT_MS = originalLockTimeout;
      }
      const admin = new Pool({ ...poolConfig('postgres'), max: 1 });
      await admin
        .query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
        .catch(() => {});
      await admin.end();
    }
  };
}

let orderSequence = 0;

/** An order, every required column filled from the real schema */
export async function createOrder(
  db: Pool,
  values: Record<string, unknown> = {}
): Promise<Record<string, any>> {
  const { rows: columns } = await db.query(
    `SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'order'
        AND is_nullable = 'NO' AND column_default IS NULL
        AND is_identity = 'NO'`
  );
  orderSequence += 1;
  const valueFor = (type: string) =>
    /int|numeric|double|real/.test(type)
      ? 10
      : type === 'boolean'
      ? false
      : /timestamp|date/.test(type)
      ? new Date()
      : /json/.test(type)
      ? '{}'
      : `test-${orderSequence}-${type.length}`;
  const given: Record<string, unknown> = {
    payment_status: 'pending',
    shipment_status: 'pending',
    status: 'new',
    currency: 'USD',
    grand_total: 10
  };
  columns.forEach((c) => {
    if (!(c.column_name in given)) {
      given[c.column_name] = valueFor(c.data_type);
    }
  });
  Object.assign(given, values);
  const names = Object.keys(given);
  const { rows } = await db.query(
    `INSERT INTO "order" (${names.map((n) => `"${n}"`).join(', ')})
     VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING *`,
    names.map((n) => given[n])
  );
  return rows[0];
}

/** The `order_placed` events written for an order */
export async function placedEvents(
  db: Pool,
  orderId: number
): Promise<Array<Record<string, any>>> {
  const { rows } = await db.query(
    `SELECT data FROM event
      WHERE name = 'order_placed' AND (data->>'order_id')::int = $1
      ORDER BY event_id`,
    [orderId]
  );
  return rows.map((row) => row.data);
}

/**
 * Every `order_placed` event, for any order or none: one written with an
 * empty payload belongs to no order, so `placedEvents` would not see it
 */
export async function countPlacedEvents(db: Pool): Promise<number> {
  const { rows } = await db.query(
    `SELECT count(*)::int AS n FROM event WHERE name = 'order_placed'`
  );
  return rows[0].n;
}

/** Make every `order_placed` insert fail until `off()` is called */
export async function failOrderPlacedWrites(db: Pool) {
  await db.query(`CREATE OR REPLACE FUNCTION fail_order_placed() RETURNS trigger AS $$
    BEGIN
      IF NEW.name = 'order_placed' THEN
        RAISE EXCEPTION 'event table unavailable';
      END IF;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql`);
  await db.query(`DROP TRIGGER IF EXISTS "FAIL_ORDER_PLACED" ON event`);
  await db.query(`CREATE TRIGGER "FAIL_ORDER_PLACED" BEFORE INSERT ON event
    FOR EACH ROW EXECUTE PROCEDURE fail_order_placed()`);
  return {
    off: () => db.query(`DROP TRIGGER IF EXISTS "FAIL_ORDER_PLACED" ON event`)
  };
}

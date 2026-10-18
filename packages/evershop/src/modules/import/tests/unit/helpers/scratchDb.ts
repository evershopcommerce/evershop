import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import migrate from '../../../migration/Version-1.0.0.js';

/**
 * The database of the import tests (§ 11). It is a scratch database that holds
 * the core schema and nothing of anyone's store, and the tests never leave
 * anything in it:
 *
 * - The tests connect to `evershop_import_scratch_test` and to no other
 *   database. The name is not read from `DB_NAME` (a developer's `.env` points
 *   that at the store they work on), and a name that does not end in
 *   `_scratch_test` is refused.
 * - Everything the tests create goes into a schema of their own, put first on
 *   the `search_path`, and the schema is dropped at the end. The tables of the
 *   store (`public`) are only read, never written, so a store that runs on the
 *   same database (its event process, its cron jobs) sees nothing of it: the
 *   copies of the category tables have no triggers, so no event is written.
 * - The host, port, user and password come from `DB_HOST`, `DB_PORT`, `DB_USER`
 *   and `DB_PASSWORD`, and when `DB_USER` is not set, from the `.env` file in
 *   the directory the tests run from (only those four keys).
 *
 * Without a reachable database the suites skip, as the other database suites of
 * the repository do. With `IMPORT_DB_REQUIRED` set they fail instead, so that a
 * missing database is never mistaken for a pass: the workflow sets it where it
 * provides a database. (It is not tied to `CI`: a workflow that has no database
 * yet would fail on every pull request.)
 */
export const SCRATCH_DB = 'evershop_import_scratch_test';

/**
 * The second scratch database, a schema-only copy of the first with no store
 * running on it. The tests that write through core's real services (and so fire
 * the triggers of the real tables) use this one, so that no event process reacts
 * to them. `IMPORT_TEST_CORE_DB` can name another; it too must end in
 * `_scratch_test`.
 */
export const CORE_SCRATCH_DB = 'evershop_import_core_scratch_test';

export interface ScratchDb {
  /** A pool whose `search_path` starts with the test schema. */
  pool: Pool;
  schema: string;
  database: string;
  /** How the database was reached, to point core's own pool at it (`pointCoreAt`). */
  connection: {
    host: string;
    port: number;
    user?: string;
    password?: string;
  };
  close(): Promise<void>;
}

function credentials(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  const file = join(process.cwd(), '.env');
  if (!env.DB_USER && existsSync(file)) {
    const parsed = dotenv.parse(readFileSync(file));
    for (const key of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD']) {
      env[key] ??= parsed[key];
    }
  }
  return env;
}

/** Set where a database is provided: a database that cannot be reached is then a failure. */
function databaseRequired(): boolean {
  const flag = process.env.IMPORT_DB_REQUIRED;
  return flag !== undefined && flag !== '' && flag !== '0' && flag !== 'false';
}

/** The tables the tests copy from the store, without triggers or foreign keys. */
const COPIED = ['category', 'category_description', 'metafield_definition'];

export interface OpenOptions {
  /**
   * Open the database for the real services: the tables of the store are not
   * copied into the test schema, because the services write to `public`.
   */
  core?: boolean;
}

export async function openScratchDb(
  options: OpenOptions = {}
): Promise<ScratchDb | null> {
  const database = options.core
    ? process.env.IMPORT_TEST_CORE_DB ?? CORE_SCRATCH_DB
    : process.env.IMPORT_TEST_DB ?? SCRATCH_DB;
  if (!database.endsWith('_scratch_test')) {
    throw new Error(
      `The import tests only run in a database whose name ends in "_scratch_test", not in "${database}".`
    );
  }
  const env = credentials();
  const schema = `import_test_${process.pid}`;
  const config = {
    host: env.DB_HOST || 'localhost',
    port: parseInt(env.DB_PORT || '5432', 10),
    user: env.DB_USER || undefined,
    password: env.DB_PASSWORD || undefined,
    database,
    connectionTimeoutMillis: 3000
  };
  const admin = new Pool({ ...config, max: 1 });
  try {
    const where = await admin.query(
      `SELECT current_database() AS name, to_regclass('public.category') AS category,
              to_regclass('public.admin_user') AS admin_user`
    );
    const row = where.rows[0];
    if (row.name !== database || !row.category || !row.admin_user) {
      throw new Error(`"${database}" does not hold the core schema`);
    }
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.query(`CREATE SCHEMA "${schema}"`);
    for (const table of options.core ? [] : COPIED) {
      await admin.query(
        `CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`
      );
    }
  } catch (e) {
    await admin.end().catch(() => {});
    if (databaseRequired()) {
      throw e;
    }
    const why =
      (e as Error).message || (e as { code?: string }).code || String(e);
    // eslint-disable-next-line no-console
    console.warn(
      `import tests: no usable scratch database "${database}" (${why}): the database suites are skipped`
    );
    return null;
  }
  const pool = new Pool({
    ...config,
    max: 8,
    options: `-c search_path=${schema},public`
  });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await migrate(client);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  return {
    pool,
    schema,
    database,
    connection: {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password
    },
    async close() {
      await pool.end();
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
    }
  };
}

/**
 * Points core's own pool (`lib/postgres/connection`) at the scratch database.
 * That pool is built from the environment when it is first imported, so this
 * must run **before** the first import of anything that reaches it: a test
 * imports the real services afterwards, with `await import(...)`. The name is
 * checked again here, because this is what lets core's services write.
 */
export function pointCoreAt(db: ScratchDb): void {
  if (!db.database.endsWith('_scratch_test')) {
    throw new Error(`Core's pool is never pointed at "${db.database}".`);
  }
  process.env.DB_HOST = db.connection.host;
  process.env.DB_PORT = String(db.connection.port);
  process.env.DB_NAME = db.database;
  if (db.connection.user) process.env.DB_USER = db.connection.user;
  if (db.connection.password) process.env.DB_PASSWORD = db.connection.password;
  process.env.DB_SSLMODE = 'disable';
}

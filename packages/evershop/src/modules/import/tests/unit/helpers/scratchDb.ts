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
 * the repository do; with `CI` set they fail, so that a missing database is
 * never mistaken for a pass.
 */
export const SCRATCH_DB = 'evershop_import_scratch_test';

export interface ScratchDb {
  /** A pool whose `search_path` starts with the test schema. */
  pool: Pool;
  schema: string;
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

/** The tables the tests copy from the store, without triggers or foreign keys. */
const COPIED = ['category', 'category_description', 'metafield_definition'];

export async function openScratchDb(): Promise<ScratchDb | null> {
  const database = process.env.IMPORT_TEST_DB ?? SCRATCH_DB;
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
    for (const table of COPIED) {
      await admin.query(
        `CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`
      );
    }
  } catch (e) {
    await admin.end().catch(() => {});
    if (process.env.CI) {
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
    async close() {
      await pool.end();
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
    }
  };
}

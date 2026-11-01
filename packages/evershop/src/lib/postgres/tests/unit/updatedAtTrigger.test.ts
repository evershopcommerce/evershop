import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Pool } from 'pg';
import { addUpdatedAtTrigger } from '../../updatedAtTrigger.js';

/**
 * `updated_at` on 20 core tables was never refreshed: no code set it, so it
 * stayed at the creation time. A migration in each owning module now adds a
 * BEFORE UPDATE trigger (`addUpdatedAtTrigger`) that sets it to now(), unless
 * the statement sets `updated_at` itself.
 *
 * The first part runs everywhere (a fake connection records the SQL). The
 * second runs the REAL migrations on stub tables in a scratch database on the
 * local Postgres server, and skips itself when no server is reachable, like
 * catalog's recomputeStats.test.ts.
 */
jest.setTimeout(30000);

const MIGRATIONS: Array<[string, string, string[]]> = [
  ['auth', 'Version-1.0.2.js', ['admin_user', 'user_token_secret']],
  ['blog', 'Version-1.0.1.js', ['blog_category', 'blog_post']],
  [
    'catalog',
    'Version-1.0.16.js',
    ['attribute_group', 'category', 'collection', 'product']
  ],
  [
    'checkout',
    'Version-1.0.14.js',
    ['cart', 'cart_item', 'order', 'order_activity', 'shipment']
  ],
  ['cms', 'Version-1.5.1.js', ['cms_page', 'widget', 'widget_placement']],
  [
    'customer',
    'Version-1.0.6.js',
    ['customer', 'customer_address', 'customer_group']
  ],
  ['promotion', 'Version-1.1.1.js', ['coupon']]
];
const ALL_TABLES = MIGRATIONS.flatMap(([, , tables]) => tables);

const loadMigration = async (module: string, file: string) =>
  (await import(`../../../../modules/${module}/migration/${file}`)).default as (
    connection: unknown
  ) => Promise<void>;

function fakeConnection(hasColumn = true) {
  const statements: string[] = [];
  return {
    statements,
    triggerTables: () =>
      statements
        .map((sql) => /CREATE TRIGGER "SET_UPDATED_AT" BEFORE UPDATE ON "(\w+)"/.exec(sql))
        .filter(Boolean)
        .map((m) => (m as RegExpExecArray)[1]),
    async query(sql: string) {
      statements.push(sql);
      return { rows: hasColumn ? [{ '?column?': 1 }] : [] };
    }
  };
}

describe('the migrations that add the trigger', () => {
  it.each(MIGRATIONS)('%s %s covers its tables', async (module, file, tables) => {
    const connection = fakeConnection();
    await (await loadMigration(module, file))(connection);
    expect(connection.triggerTables()).toEqual(tables);
  });

  it('cover the 20 tables no code maintains, once each', () => {
    expect(new Set(ALL_TABLES).size).toBe(20);
    expect(ALL_TABLES).toHaveLength(20);
  });

  it('the helper refuses a bad table name and a table without updated_at', async () => {
    await expect(
      addUpdatedAtTrigger(fakeConnection() as any, 'product; DROP TABLE x')
    ).rejects.toThrow('invalid table name');
    const noColumn = fakeConnection(false);
    await expect(addUpdatedAtTrigger(noColumn as any, 'product')).rejects.toThrow(
      "table 'product' has no updated_at column"
    );
    expect(noColumn.triggerTables()).toEqual([]);
  });
});

const SCRATCH_DB = 'evershop_updated_at_scratch_test';

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
    'updatedAtTrigger.test: no local Postgres reachable — DB-backed suite skipped'
  );
}

describeDb('the trigger on a real database (scratch DB)', () => {
  let db: Pool;
  const OLD = '2001-01-01T00:00:00.000Z';

  const updatedAt = async (table: string): Promise<string> =>
    (await db.query(`SELECT updated_at FROM "${table}" WHERE id = 1`)).rows[0]
      .updated_at.toISOString();

  beforeAll(async () => {
    db = new Pool({ ...poolConfig(SCRATCH_DB), max: 2 });
    // Stub tables: only what the trigger needs
    for (const table of ALL_TABLES) {
      await db.query(
        `CREATE TABLE "${table}" (id INT PRIMARY KEY, name TEXT,
           updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)`
      );
      await db.query(
        `INSERT INTO "${table}" (id, name, updated_at) VALUES (1, 'a', $1)`,
        [OLD]
      );
    }
    const connection = await db.connect();
    try {
      for (const [module, file] of MIGRATIONS) {
        await (await loadMigration(module, file))(connection);
      }
      // Running one again is harmless
      await (await loadMigration('catalog', 'Version-1.0.16.js'))(connection);
    } finally {
      connection.release();
    }
  });

  afterAll(async () => {
    await db?.end();
    const admin = new Pool({ ...poolConfig('postgres'), max: 1 });
    await admin
      .query(`DROP DATABASE IF EXISTS ${SCRATCH_DB} WITH (FORCE)`)
      .catch(() => {});
    await admin.end();
  });

  it('every table has exactly one SET_UPDATED_AT trigger', async () => {
    const { rows } = await db.query(
      `SELECT c.relname AS table, count(*)::int AS n
         FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
        WHERE t.tgname = 'SET_UPDATED_AT'
        GROUP BY c.relname ORDER BY c.relname`
    );
    expect(rows).toEqual(
      [...ALL_TABLES].sort().map((table) => ({ table, n: 1 }))
    );
  });

  it('an update refreshes updated_at on every table', async () => {
    const { rows } = await db.query(`SELECT now() AS now`);
    const now = rows[0].now.toISOString();
    for (const table of ALL_TABLES) {
      await db.query(`UPDATE "${table}" SET name = 'b' WHERE id = 1`);
      expect([table, await updatedAt(table)]).not.toEqual([table, OLD]);
      expect(new Date(await updatedAt(table)).getTime()).toBeGreaterThanOrEqual(
        new Date(now).getTime()
      );
    }
  });

  it('a value the statement sets itself is kept (an import writing a historical date)', async () => {
    for (const table of ALL_TABLES) {
      await db.query(
        `UPDATE "${table}" SET name = 'c', updated_at = $1 WHERE id = 1`,
        ['1999-06-01T00:00:00.000Z']
      );
      expect([table, await updatedAt(table)]).toEqual([
        table,
        '1999-06-01T00:00:00.000Z'
      ]);
    }
  });
});

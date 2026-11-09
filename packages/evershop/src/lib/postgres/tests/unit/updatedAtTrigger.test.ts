import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  commit,
  rollback,
  startTransaction
} from '@evershop/postgres-query-builder';
import { Pool } from 'pg';
import semver from 'semver';
import { addUpdatedAtTrigger } from '../../updatedAtTrigger.js';

/**
 * `updated_at` on 19 core tables was never refreshed: no code set it, so it
 * stayed at the creation time. A migration in each owning module now adds a
 * BEFORE UPDATE trigger (`addUpdatedAtTrigger`) that sets it to now(), unless
 * the statement sets `updated_at` itself.
 *
 * The first part runs everywhere (a fake connection records the SQL). The
 * second runs ALL the core migrations into a scratch database on the local
 * Postgres server, as `scripts/ci/migrateCoreSchema.mjs` does, and skips itself
 * when no server is reachable (like catalog's recomputeStats.test.ts). It runs
 * on the real schema on purpose: a list checked against stub tables passed
 * while naming `user_token_secret` (dropped in auth 1.0.1) and `widget`
 * (renamed to `widget_instance` in cms 1.3.0).
 */
jest.setTimeout(60000);

const MIGRATIONS: Array<[string, string, string[]]> = [
  ['auth', 'Version-1.0.2.js', ['admin_user']],
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
  [
    'cms',
    'Version-1.5.1.js',
    ['cms_page', 'widget_instance', 'widget_placement']
  ],
  [
    'customer',
    'Version-1.0.6.js',
    ['customer', 'customer_address', 'customer_group']
  ],
  ['promotion', 'Version-1.1.1.js', ['coupon']]
];
const ALL_TABLES = MIGRATIONS.flatMap(([, , tables]) => tables);
// Tables with `updated_at` left out on purpose: their code sets it itself
// (the author's ruling), and `migration` is the runner's own bookkeeping.
const LEFT_OUT = [
  'changeset',
  'landing_page',
  'metafield_definition',
  'migration',
  'package',
  'rollout_plan',
  'theme_install_state',
  'webhook',
  'webhook_delivery'
];

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
        .map((sql) =>
          /CREATE TRIGGER "SET_UPDATED_AT" BEFORE UPDATE ON "(\w+)"/.exec(sql)
        )
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

  it('cover 19 tables, once each', () => {
    expect(new Set(ALL_TABLES).size).toBe(19);
    expect(ALL_TABLES).toHaveLength(19);
  });

  it('the helper refuses a bad table name and a table without updated_at', async () => {
    await expect(
      addUpdatedAtTrigger(fakeConnection() as any, 'product; DROP TABLE x')
    ).rejects.toThrow('invalid table name');
    const noColumn = fakeConnection(false);
    await expect(
      addUpdatedAtTrigger(noColumn as any, 'product')
    ).rejects.toThrow("table 'product' has no updated_at column");
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

describeDb('the real core migrations (scratch DB)', () => {
  let db: Pool;

  const triggerCounts = async () =>
    (
      await db.query(
        `SELECT c.relname AS table, count(*)::int AS n
           FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
          WHERE t.tgname = 'SET_UPDATED_AT'
          GROUP BY c.relname ORDER BY c.relname`
      )
    ).rows;

  beforeAll(async () => {
    db = new Pool({ ...poolConfig(SCRATCH_DB), max: 2 });
    // One transaction for the whole chain, as the runner opens one per version:
    // outside a transaction the query builder releases the client after its
    // first query. `commit` releases it at the end.
    const connection = await db.connect();
    await startTransaction(connection);
    const { getCoreModules } = await import(
      '../../../../bin/lib/loadModules.js'
    );
    const { migrate } = await import('../../../../bin/lib/bootstrap/migrate.js');
    // `migrate` logs a failed migration and then calls process.exit: make
    // that a failure of this test instead of the end of the test run
    const exit = jest.spyOn(process, 'exit').mockImplementation(((
      code?: number
    ) => {
      throw new Error(`a core migration failed (process.exit ${code})`);
    }) as never);
    try {
      // With our own connection: no pool of core's is opened
      // migrate.js is JavaScript: its `connection = null` default reads as `null`
      await migrate(getCoreModules(), connection as never);
      await commit(connection);
    } catch (e) {
      await rollback(connection);
      throw e;
    } finally {
      exit.mockRestore();
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

  it('run to the end, the new versions included', async () => {
    const { rows } = await db.query(
      `SELECT module, version FROM migration WHERE module = ANY($1) ORDER BY module`,
      [MIGRATIONS.map(([module]) => module)]
    );
    // Each module got at least as far as its updated_at migration; a later
    // migration of the same module may follow it
    const minimum = new Map(
      MIGRATIONS.map(([module, file]) => [
        module,
        file.replace('Version-', '').replace('.js', '')
      ])
    );
    expect(
      rows.map(({ module, version }) => [
        module,
        minimum.get(module),
        semver.gte(version, minimum.get(module)!)
      ])
    ).toEqual(
      [...minimum.keys()]
        .sort((a, b) => a.localeCompare(b))
        .map((module) => [module, minimum.get(module), true])
    );
  });

  it('every one of the 19 tables has exactly one trigger, and nothing else has it', async () => {
    expect(await triggerCounts()).toEqual(
      [...ALL_TABLES].sort().map((table) => ({ table, n: 1 }))
    );
  });

  it('every table with updated_at is either covered or left out on purpose', async () => {
    const { rows } = await db.query(
      `SELECT table_name FROM information_schema.columns
        WHERE table_schema = current_schema() AND column_name = 'updated_at'
        ORDER BY table_name`
    );
    expect(rows.map((r) => r.table_name)).toEqual(
      [...ALL_TABLES, ...LEFT_OUT].sort()
    );
  });

  it('on a real table: an update refreshes updated_at, a value the statement sets is kept', async () => {
    const { rows } = await db.query(
      `INSERT INTO customer_group (group_name) VALUES ('Wholesale')
       RETURNING customer_group_id AS id`
    );
    const { id } = rows[0];
    const updatedAt = async () =>
      (
        await db.query(
          `SELECT updated_at FROM customer_group WHERE customer_group_id = $1`,
          [id]
        )
      ).rows[0].updated_at.toISOString();

    // An explicit value (an import writing a historical date) is kept
    await db.query(
      `UPDATE customer_group SET updated_at = '2001-01-01T00:00:00Z' WHERE customer_group_id = $1`,
      [id]
    );
    expect(await updatedAt()).toBe('2001-01-01T00:00:00.000Z');

    // Any other update refreshes it
    await db.query(
      `UPDATE customer_group SET group_name = 'Trade' WHERE customer_group_id = $1`,
      [id]
    );
    expect(new Date(await updatedAt()).getFullYear()).toBeGreaterThan(2001);
  });

  it('running a migration again changes nothing', async () => {
    const connection = await db.connect();
    try {
      await (await loadMigration('catalog', 'Version-1.0.16.js'))(connection);
    } finally {
      connection.release();
    }
    expect(await triggerCounts()).toEqual(
      [...ALL_TABLES].sort().map((table) => ({ table, n: 1 }))
    );
  });
});

import { afterAll, describe, expect, it, jest } from '@jest/globals';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { graphql } from 'graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { ensureRoutesLoaded } from '../../../../../bin/lib/ensureRoutesLoaded.js';
import { openScratchDb, pointCoreAt } from '../helpers/scratchDb.js';

/**
 * `importJobs` in the admin schema (§ 8.1), through the real schema of the store
 * and the real tables: the list of past imports, newest first, with the filters
 * of the grid. It uses the second scratch database (a copy of the core schema
 * with no store running on it). Each test removes what it made.
 */
jest.setTimeout(120_000);

process.env.SUPPRESS_NO_CONFIG_WARNING = '1';
process.env.SUPPRESS_STRICTNESS_CHECK = '1';
process.env.ALLOW_CONFIG_MUTATIONS = 'true';

const db = await openScratchDb({ core: true });
if (db) {
  pointCoreAt(db);
  // The tables of the import are in the private schema of the test; core's own
  // pool gets the same `search_path`, as in the worker tests.
  process.env.PGOPTIONS = `-c search_path=${db.schema},public`;
}
const describeDb = db ? describe : describe.skip;

const corePool = db
  ? (await import('../../../../../lib/postgres/connection.js')).pool
  : null;
// The SDL of the whole admin schema, as the store assembles it, with the
// resolvers of the import and the two the types it uses need (the store loads all
// of them by a dynamic import that Jest cannot follow).
const schema = db
  ? makeExecutableSchema({
      typeDefs: (
        await import('../../../../graphql/services/buildTypes.js')
      ).buildTypeDefs(true),
      resolvers: [
        { JSON: GraphQLJSON },
        (
          await import(
            '../../../../base/graphql/types/DateTime/DateTime.resolvers.js'
          )
        ).default,
        (
          await import(
            '../../../graphql/types/ImportJob/ImportJob.admin.resolvers.js'
          )
        ).default
      ],
      resolverValidationOptions: { requireResolversToMatchSchema: 'ignore' }
    })
  : null;
if (db) {
  // The bootstrap of the import module registers the filters of the list.
  (await import('../../../bootstrap.js')).default();
  ensureRoutesLoaded();
}

afterAll(async () => {
  await corePool?.end();
  await db?.close();
});

const q = async (sql: string, params: unknown[] = []) =>
  (await db!.pool.query(sql, params)).rows;

async function cleanUp() {
  await q(`TRUNCATE import_job RESTART IDENTITY CASCADE`);
  await q(`DELETE FROM admin_user WHERE email LIKE 'import-graphql-%'`);
}

async function job(fields: {
  entity?: string;
  status?: string;
  fileName: string;
  fileSize?: number;
  createdBy?: number | null;
  counts?: object;
  ago?: number;
}) {
  const [row] = await q(
    `INSERT INTO import_job
       (entity, status, file_name, file_size, created_by, counts, created_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, now() - ($7 * interval '1 minute'))
     RETURNING import_job_id, uuid`,
    [
      fields.entity ?? 'category',
      fields.status ?? 'completed',
      fields.fileName,
      fields.fileSize ?? 1000,
      fields.createdBy ?? null,
      JSON.stringify(fields.counts ?? {}),
      fields.ago ?? 0
    ]
  );
  return row as { import_job_id: number; uuid: string };
}

const ask = async (filters: unknown[] = [], user: unknown = { id: 1 }) => {
  const result = await graphql({
    schema: schema!,
    source: `query ($filters: [FilterInput]) {
      importJobs(filters: $filters) {
        total
        currentPage
        currentFilters { key operation value }
        items {
          importJobId uuid entity mode status stage fileName fileSize counts
          errorMessage createdByName createdAt { value } startedAt { value }
          finishedAt { value } active deleteApi
        }
      }
    }`,
    variableValues: { filters },
    contextValue: { user, pool: corePool, isAdmin: true }
  });
  expect(result.errors).toBeUndefined();
  return result.data!.importJobs as {
    total: number;
    currentPage: number;
    currentFilters: Array<{ key: string; operation: string; value: unknown }>;
    items: Array<Record<string, any>>;
  } | null;
};

const names = (list: { items: Array<Record<string, any>> } | null) =>
  list!.items.map((item) => item.fileName);

describeDb('importJobs in the admin schema', () => {
  it('lists the past imports newest first, without an upload that has not arrived', async () => {
    await cleanUp();
    try {
      await job({ fileName: 'old.csv', ago: 30 });
      await job({ fileName: 'new.csv', ago: 1 });
      await job({ fileName: 'arriving.csv', status: 'uploading' });
      const list = await ask();
      expect(names(list)).toEqual(['new.csv', 'old.csv']);
      expect(list!.total).toBe(2);
      expect(list!.currentPage).toBe(1);
    } finally {
      await cleanUp();
    }
  });

  it('gives a job its fields: the counts, the name of the admin, the state, and the address to delete it', async () => {
    await cleanUp();
    try {
      const [admin] = await q(
        `INSERT INTO admin_user (status, email, password, full_name)
         VALUES (true, 'import-graphql-1@example.com', 'x', 'Jane Admin') RETURNING admin_user_id`
      );
      const made = await job({
        entity: 'product',
        status: 'completed',
        fileName: 'products.csv',
        fileSize: 12_345_678,
        createdBy: admin.admin_user_id,
        counts: { total: 10, created: 8, updated: 1, failed: 1 }
      });
      const [item] = (await ask())!.items;
      expect(item).toMatchObject({
        importJobId: made.import_job_id,
        uuid: made.uuid,
        entity: 'product',
        mode: 'upsert',
        status: 'completed',
        fileName: 'products.csv',
        fileSize: 12_345_678,
        counts: { total: 10, created: 8, updated: 1, failed: 1 },
        createdByName: 'Jane Admin',
        active: false,
        deleteApi: `/api/import-jobs/${made.uuid}`
      });
      expect(item.createdAt.value).toEqual(expect.any(String));
      expect(item.startedAt).toBeNull();
    } finally {
      await cleanUp();
    }
  });

  it('says a job is active while a worker may be writing: it cannot be deleted', async () => {
    await cleanUp();
    try {
      for (const status of ['validating', 'queued', 'running']) {
        // eslint-disable-next-line no-await-in-loop
        await cleanUp();
        // eslint-disable-next-line no-await-in-loop
        await job({ fileName: `${status}.csv`, status });
        // eslint-disable-next-line no-await-in-loop
        expect([status, (await ask())!.items[0].active]).toEqual([
          status,
          true
        ]);
      }
      for (const status of [
        'uploaded',
        'validated',
        'completed',
        'failed',
        'stopped',
        'canceled',
        'interrupted'
      ]) {
        // eslint-disable-next-line no-await-in-loop
        await cleanUp();
        // eslint-disable-next-line no-await-in-loop
        await job({ fileName: `${status}.csv`, status });
        // eslint-disable-next-line no-await-in-loop
        expect([status, (await ask())!.items[0].active]).toEqual([
          status,
          false
        ]);
      }
    } finally {
      await cleanUp();
    }
  });

  it('filters by status and by entity, and reports the filters it applied', async () => {
    await cleanUp();
    try {
      await job({
        fileName: 'a.csv',
        entity: 'category',
        status: 'completed',
        ago: 5
      });
      await job({
        fileName: 'b.csv',
        entity: 'product',
        status: 'completed',
        ago: 4
      });
      await job({
        fileName: 'c.csv',
        entity: 'product',
        status: 'failed',
        ago: 3
      });
      const byStatus = await ask([
        { key: 'status', operation: 'eq', value: 'completed' }
      ]);
      expect(names(byStatus)).toEqual(['b.csv', 'a.csv']);
      expect(byStatus!.total).toBe(2);
      expect(byStatus!.currentFilters).toEqual(
        expect.arrayContaining([
          { key: 'status', operation: 'eq', value: 'completed' }
        ])
      );
      const both = await ask([
        { key: 'status', operation: 'eq', value: 'completed' },
        { key: 'entity', operation: 'eq', value: 'product' }
      ]);
      expect(names(both)).toEqual(['b.csv']);
    } finally {
      await cleanUp();
    }
  });

  it('ignores a status or an entity it does not know, like an address typed by hand, and does not apply it', async () => {
    await cleanUp();
    try {
      await job({ fileName: 'a.csv' });
      await job({ fileName: 'b.csv', entity: 'product' });
      const list = await ask([
        { key: 'status', operation: 'eq', value: 'nonsense' },
        { key: 'entity', operation: 'eq', value: "x' OR 1=1 --" }
      ]);
      expect(list!.total).toBe(2);
      expect(list!.currentFilters.map((f) => f.key)).not.toContain('status');
      expect(list!.currentFilters.map((f) => f.key)).not.toContain('entity');
    } finally {
      await cleanUp();
    }
  });

  it('finds a part of a file name, and takes % and _ as characters', async () => {
    await cleanUp();
    try {
      await job({ fileName: 'spring_sale.csv', ago: 3 });
      await job({ fileName: 'springXsale.csv', ago: 2 });
      await job({ fileName: '100%.csv', ago: 1 });
      await job({ fileName: 'other.csv', ago: 0 });
      const like = (value: string) =>
        ask([{ key: 'file', operation: 'like', value }]);
      expect(names(await like('SALE'))).toEqual([
        'springXsale.csv',
        'spring_sale.csv'
      ]);
      expect(names(await like('g_s'))).toEqual(['spring_sale.csv']);
      expect(names(await like('100%'))).toEqual(['100%.csv']);
      expect(names(await like('%'))).toEqual(['100%.csv']);
      const blank = await like('   ');
      expect(blank!.total).toBe(4);
      // A blank search is no search: it is not reported as a filter either.
      expect(blank!.currentFilters.map((f) => f.key)).not.toContain('file');
    } finally {
      await cleanUp();
    }
  });

  it('orders by a column that is allowed, in either direction, and not by one that is not', async () => {
    await cleanUp();
    try {
      await job({ fileName: 'b.csv', fileSize: 20, ago: 3 });
      await job({ fileName: 'c.csv', fileSize: 30, ago: 2 });
      await job({ fileName: 'a.csv', fileSize: 10, ago: 1 });
      const sort = (value: string, direction?: string) =>
        ask([
          { key: 'ob', operation: 'eq', value },
          ...(direction
            ? [{ key: 'od', operation: 'eq', value: direction }]
            : [])
        ]);
      expect(names(await sort('file_name'))).toEqual([
        'a.csv',
        'b.csv',
        'c.csv'
      ]);
      expect(names(await sort('file_name', 'DESC'))).toEqual([
        'c.csv',
        'b.csv',
        'a.csv'
      ]);
      expect(names(await sort('file_size', 'DESC'))).toEqual([
        'c.csv',
        'b.csv',
        'a.csv'
      ]);
      // Not a column of the list: the default order stands.
      const odd = await sort('password');
      expect(names(odd)).toEqual(['a.csv', 'c.csv', 'b.csv']);
      expect(odd!.currentFilters.map((f) => f.key)).not.toContain('ob');
    } finally {
      await cleanUp();
    }
  });

  it('gives a page at a time, with the total of all', async () => {
    await cleanUp();
    try {
      for (let n = 0; n < 7; n += 1) {
        // eslint-disable-next-line no-await-in-loop
        await job({ fileName: `f${n}.csv`, ago: 100 - n });
      }
      const first = await ask([
        { key: 'limit', operation: 'eq', value: '3' },
        { key: 'page', operation: 'eq', value: '1' }
      ]);
      expect(names(first)).toEqual(['f6.csv', 'f5.csv', 'f4.csv']);
      expect(first!.total).toBe(7);
      const third = await ask([
        { key: 'limit', operation: 'eq', value: '3' },
        { key: 'page', operation: 'eq', value: '3' }
      ]);
      expect(names(third)).toEqual(['f0.csv']);
      expect(third!.currentPage).toBe(3);
      expect(third!.total).toBe(7);
    } finally {
      await cleanUp();
    }
  });

  it('is for the admin only: without a user it gives nothing', async () => {
    await cleanUp();
    try {
      await job({ fileName: 'a.csv' });
      expect(await ask([], null)).toBeNull();
    } finally {
      await cleanUp();
    }
  });
});

import { execSync } from 'child_process';
import { afterAll, describe, expect, it, jest } from '@jest/globals';
import { Pool } from 'pg';
import { nodeSha256 } from '../../../adapters/nodeSha256.js';
import { PgJobAdmin } from '../../../adapters/PgJobAdmin.js';
import { ImportService } from '../../../services/jobs/ImportService.js';
import type { ImportJob } from '../../../services/job/types.js';
import {
  categoryFile,
  categoryRow
} from '../../../services/rules/categoryFiles.js';
import { CollectingLogger } from '../../../testing/CollectingLogger.js';
import { openScratchDb, pointCoreAt } from '../helpers/scratchDb.js';

/**
 * From a request to a worker, on a database (§ 8.4): an API action writes the
 * event `import_job_requested`; the event process calls the subscriber with its
 * data; the subscriber starts a real worker process, which boots the store,
 * claims the job and does its work. Each test removes what it made.
 *
 * It uses the second scratch database (no store runs on it). The tables of the
 * import are in the private schema of the test, so the worker process gets the
 * same `search_path` through `PGOPTIONS`, and so does core's own pool.
 */
jest.setTimeout(180_000);

// The worker processes, like this one, find no config directory in a checkout.
process.env.SUPPRESS_NO_CONFIG_WARNING = '1';
process.env.SUPPRESS_STRICTNESS_CHECK = '1';

const db = await openScratchDb({ core: true });
if (db) {
  pointCoreAt(db);
  process.env.PGOPTIONS = `-c search_path=${db.schema},public`;
}
const describeDb = db ? describe : describe.skip;

// Core is imported after its pool has been pointed at the scratch database.
const core = db
  ? {
      pool: (await import('../../../../../lib/postgres/connection.js')).pool,
      ...(await import('../../../adapters/CoreJobRequests.js')),
      ...(await import('../../../dispatch/runtime.js')),
      subscriber: (
        await import(
          '../../../subscribers/import_job_requested/startImportWorker.js'
        )
      ).default
    }
  : null;

afterAll(async () => {
  // The workers are over before the schema they use is dropped.
  await until(() => core?.dispatchDeps().workers.running() === 0, 30_000).catch(
    () => undefined
  );
  await core?.pool.end();
  await db?.close();
});

async function until(done: () => boolean | Promise<boolean>, ms = 90_000) {
  const end = Date.now() + ms;
  while (!(await done())) {
    if (Date.now() > end) throw new Error('timed out');
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }
}

let baseline = { category: 0, event: 0 };

async function remember() {
  const rows = await db!.pool.query(
    `SELECT COALESCE((SELECT max(category_id) FROM category), 0) AS category,
            COALESCE((SELECT max(event_id) FROM event), 0) AS event`
  );
  baseline = {
    category: Number(rows.rows[0].category),
    event: Number(rows.rows[0].event)
  };
}

async function cleanUp() {
  await db!.pool.query('TRUNCATE import_job RESTART IDENTITY CASCADE');
  await db!.pool.query('DELETE FROM category WHERE category_id > $1', [
    baseline.category
  ]);
  await db!.pool.query('DELETE FROM event WHERE event_id > $1', [
    baseline.event
  ]);
}

/** The requests that are waiting, taken off the queue as the event process takes them. */
async function takeRequests(): Promise<Array<{ jobUuid: string }>> {
  const rows = await db!.pool.query(
    `SELECT event_id, data FROM event
      WHERE name = 'import_job_requested' ORDER BY event_id`
  );
  await db!.pool.query('DELETE FROM event WHERE event_id = ANY($1)', [
    rows.rows.map((row) => row.event_id)
  ]);
  return rows.rows.map((row) => row.data);
}

const row = (key: string, more: Record<string, string> = {}) =>
  categoryRow({ url_key: key, name: key.toUpperCase(), image: '', ...more });

function service(logger = new CollectingLogger()) {
  return new ImportService({
    jobs: new PgJobAdmin(core!.pool),
    sha256: nodeSha256,
    maxFileBytes: 10_000_000,
    requests: new core!.CoreJobRequests(core!.pool, logger)
  });
}

const upload = (s: ImportService, text: string) =>
  s.upload({
    entity: 'category',
    fileName: 'categories.csv',
    createdBy: null,
    file: (async function* () {
      yield Buffer.from(text);
    })()
  });

const statusOf = async (id: number): Promise<ImportJob | null> =>
  new PgJobAdmin(core!.pool).get(id);

describeDb('the request for a worker, written as an event', () => {
  it('writes import_job_requested with the uuid of the job, after each action that makes a job wait', async () => {
    await cleanUp();
    await remember();
    try {
      const s = service();
      const { job } = await upload(s, categoryFile(row('a')));
      expect(await takeRequests()).toEqual([{ jobUuid: job.uuid }]);

      // A worker checks the file (here: the state is set as the worker leaves it).
      await db!.pool.query(
        `UPDATE import_job SET status = 'validated', counts = '{}' WHERE import_job_id = $1`,
        [job.id]
      );
      await s.recheck(job.id);
      expect(await takeRequests()).toEqual([{ jobUuid: job.uuid }]);

      await db!.pool.query(
        `UPDATE import_job SET status = 'validated' WHERE import_job_id = $1`,
        [job.id]
      );
      await s.start(job.id);
      expect(await takeRequests()).toEqual([{ jobUuid: job.uuid }]);

      await db!.pool.query(
        `UPDATE import_job SET status = 'interrupted', started_at = now() WHERE import_job_id = $1`,
        [job.id]
      );
      await s.resume(job.id);
      expect(await takeRequests()).toEqual([{ jobUuid: job.uuid }]);

      // Cancel and Delete need no worker.
      await s.cancel(job.id);
      await s.remove(job.id);
      expect(await takeRequests()).toEqual([]);
    } finally {
      await cleanUp();
    }
  });

  it('is a pending event that the event process claims like any other', async () => {
    await cleanUp();
    await remember();
    try {
      await new core!.CoreJobRequests(
        core!.pool,
        new CollectingLogger()
      ).request('11111111-2222-4333-8444-555555555555');
      const stored = await db!.pool.query(
        `SELECT name, data, status FROM event WHERE event_id > $1`,
        [baseline.event]
      );
      expect(stored.rows).toEqual([
        {
          name: 'import_job_requested',
          data: { jobUuid: '11111111-2222-4333-8444-555555555555' },
          status: 'pending'
        }
      ]);
    } finally {
      await cleanUp();
    }
  });

  it('never throws when the event cannot be written, and says so: the dispatch cron asks again', async () => {
    const logger = new CollectingLogger();
    // A pool that cannot reach the database.
    const broken = new Pool({
      host: db!.connection.host,
      port: 1,
      user: db!.connection.user,
      password: db!.connection.password,
      database: db!.database,
      connectionTimeoutMillis: 2000
    });
    try {
      await expect(
        new core!.CoreJobRequests(broken, logger).request(
          '11111111-2222-4333-8444-555555555555'
        )
      ).resolves.toBeUndefined();
      expect(logger.of('error')).toHaveLength(1);
      expect(logger.of('error')[0].meta).toMatchObject({
        jobUuid: '11111111-2222-4333-8444-555555555555'
      });
    } finally {
      await broken.end();
    }
  });
});

describeDb('the subscriber starts a real worker process', () => {
  it('checks an uploaded file, then imports it after Start, each by a worker the event started', async () => {
    await cleanUp();
    await remember();
    try {
      const s = service();
      const { job } = await upload(
        s,
        categoryFile(row('women'), row('shoes', { parent: 'women' }))
      );

      // The event process: takes the event and calls the subscriber.
      const [first, ...others] = await takeRequests();
      expect(others).toEqual([]);
      await core!.subscriber(first);
      await until(async () => (await statusOf(job.id))?.status === 'validated');
      expect(await statusOf(job.id)).toMatchObject({
        counts: { total: 2, createRows: 2, errors: 0 },
        attempt: 1
      });
      expect((await statusOf(job.id))!.worker).toMatch(/:\d+$/);

      await s.start(job.id);
      const [second] = await takeRequests();
      await core!.subscriber(second);
      await until(async () => (await statusOf(job.id))?.status === 'completed');
      expect(await statusOf(job.id)).toMatchObject({
        counts: { created: 2, failed: 0, skipped: 0 },
        attempt: 2
      });
      const made = await db!.pool.query(
        `SELECT cd.url_key, parent.url_key AS parent
           FROM category c
           JOIN category_description cd ON cd.category_description_category_id = c.category_id
           LEFT JOIN category_description parent ON parent.category_description_category_id = c.parent_id
          WHERE c.category_id > $1 ORDER BY cd.url_key`,
        [baseline.category]
      );
      expect(made.rows).toEqual([
        { url_key: 'shoes', parent: 'women' },
        { url_key: 'women', parent: null }
      ]);
      await until(() => core!.dispatchDeps().workers.running() === 0, 30_000);
    } finally {
      await cleanUp();
    }
  });

  it('stops at SIGTERM after the row it is on, leaves the job interrupted, and a new worker resumes it without a duplicate', async () => {
    await cleanUp();
    await remember();
    try {
      const s = service();
      const keys = Array.from(
        { length: 600 },
        (_, n) => `bulk-${String(n).padStart(3, '0')}`
      );
      const { job } = await upload(s, categoryFile(...keys.map((k) => row(k))));
      await core!.subscriber((await takeRequests())[0]);
      await until(async () => (await statusOf(job.id))?.status === 'validated');
      await s.start(job.id);
      await core!.subscriber((await takeRequests())[0]);

      // Wait until the worker has saved some rows, then ask it to stop.
      await until(
        async () => ((await statusOf(job.id))?.counts.lastUnit ?? 0) > 0,
        60_000
      );
      const running = (await statusOf(job.id))!;
      expect(running.status).toBe('running');
      const pid = Number(running.worker!.split(':').pop());
      if (process.platform !== 'win32') {
        // The worker lowers its own priority (§ 8.5): its nice value is 10.
        expect(execSync(`ps -o ni= -p ${pid}`).toString().trim()).toBe('10');
      }
      process.kill(pid, 'SIGTERM');
      await until(
        async () => (await statusOf(job.id))?.status === 'interrupted',
        30_000
      );
      const stopped = (await statusOf(job.id))!;
      expect(stopped.counts.created).toBeGreaterThan(0);
      expect(stopped.counts.created).toBeLessThan(600);
      expect(stopped.counts.lastUnit).toBe(stopped.counts.created);
      await until(() => core!.dispatchDeps().workers.running() === 0, 30_000);

      // Resume: a new worker, a new process.
      await s.resume(job.id);
      await core!.subscriber((await takeRequests())[0]);
      await until(async () => (await statusOf(job.id))?.status === 'completed');
      const done = (await statusOf(job.id))!;
      expect(done.counts).toMatchObject({ failed: 0, skipped: 0 });
      expect(done.counts.created + done.counts.updated).toBe(600);
      expect(done.attempt).toBe(3);
      const made = await db!.pool.query(
        `SELECT count(*)::int AS n, count(DISTINCT cd.url_key)::int AS keys
           FROM category c
           JOIN category_description cd ON cd.category_description_category_id = c.category_id
          WHERE c.category_id > $1`,
        [baseline.category]
      );
      expect(made.rows[0]).toEqual({ n: 600, keys: 600 });
      await until(() => core!.dispatchDeps().workers.running() === 0, 30_000);
    } finally {
      await cleanUp();
    }
  });

  it('ends the job failed, with the reason, when the worker cannot boot (J2), instead of leaving it to be started again and again', async () => {
    await cleanUp();
    await remember();
    process.env.bootstrapContext = '{this is not json';
    try {
      const s = service();
      const { job } = await upload(s, categoryFile(row('women')));
      const [request] = await takeRequests();
      await core!.subscriber(request);
      await until(async () => (await statusOf(job.id))?.status === 'failed');
      const failed = await statusOf(job.id);
      expect(failed!.errorMessage).toMatch(
        /^The import worker could not start: /
      );
      expect(failed).toMatchObject({ attempt: 1, startedAt: null });
      expect(failed!.finishedAt).not.toBeNull();
      await until(() => core!.dispatchDeps().workers.running() === 0, 30_000);
      const none = await db!.pool.query(
        'SELECT count(*)::int AS n FROM category WHERE category_id > $1',
        [baseline.category]
      );
      expect(none.rows[0].n).toBe(0);
    } finally {
      delete process.env.bootstrapContext;
      await cleanUp();
    }
  });
});

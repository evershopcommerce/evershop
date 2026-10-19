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
process.env.ALLOW_CONFIG_MUTATIONS = 'true';

// No event process runs on this database, so the events that the imported
// categories write are never taken, and a worker that waited for them would wait
// for ever. The workers of these tests do not wait for the event queue (the
// test of the wait itself sets its own marks, and puts this back).
const NO_BACKPRESSURE = JSON.stringify({
  system: { import: { eventBacklogHigh: 1_000_000 } }
});
process.env.NODE_CONFIG = NO_BACKPRESSURE;

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
      importDispatch: (await import('../../../jobs/importDispatch.js')).default,
      importRecover: (await import('../../../jobs/importRecover.js')).default,
      importCleanup: (await import('../../../jobs/importCleanup.js')).default,
      config: (await import('config')).default as unknown as {
        util: { extendDeep: (...args: unknown[]) => void };
      },
      subscriber: (
        await import(
          '../../../subscribers/import_job_requested/startImportWorker.js'
        )
      ).default
    }
  : null;

// The cron jobs are built once, so the retention they are to follow is set
// before the first of them runs: 2 days, not the 7 of the default.
core?.config.util.extendDeep(core.config, {
  system: { import: { retentionDays: 2 } }
});

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

describeDb('the cron jobs, on real jobs and real workers', () => {
  const pause = (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  /** The event table has one request for each of these jobs, or none. */
  const pendingRequests = async () =>
    (
      await db!.pool.query(
        `SELECT data->>'jobUuid' AS job_uuid FROM event
          WHERE name = 'import_job_requested' ORDER BY event_id`
      )
    ).rows.map((row) => row.job_uuid as string);

  const backdate = (id: number, column: string, interval: string) =>
    db!.pool.query(
      `UPDATE import_job SET ${column} = now() - interval '${interval}' WHERE import_job_id = $1`,
      [id]
    );

  it('importDispatch asks again for a job whose event was lost, once, and the worker then checks it', async () => {
    await cleanUp();
    await remember();
    try {
      const s = service();
      const { job } = await upload(s, categoryFile(row('lost')));
      // The event is lost before anyone answers it.
      expect(await takeRequests()).toHaveLength(1);

      // Not yet: it has waited a moment only.
      await core!.importDispatch();
      expect(await pendingRequests()).toEqual([]);

      await backdate(job.id, 'status_changed_at', '1 minute');
      await core!.importDispatch();
      expect(await pendingRequests()).toEqual([job.uuid]);
      // The request is on its way: the next minutes add no copy of it.
      await core!.importDispatch();
      await core!.importDispatch();
      expect(await pendingRequests()).toEqual([job.uuid]);

      await core!.subscriber((await takeRequests())[0]);
      await until(async () => (await statusOf(job.id))?.status === 'validated');
      // The job is no longer waiting, so nothing is asked.
      await backdate(job.id, 'status_changed_at', '1 minute');
      await core!.importDispatch();
      expect(await pendingRequests()).toEqual([]);
      await until(() => core!.dispatchDeps().workers.running() === 0, 30_000);
    } finally {
      await cleanUp();
    }
  });

  it('importDispatch does not count an event that an event process left half done', async () => {
    await cleanUp();
    await remember();
    try {
      const s = service();
      const { job } = await upload(s, categoryFile(row('stuck')));
      await backdate(job.id, 'status_changed_at', '1 minute');
      // The event process claimed the request and died: processing for 10 minutes.
      await db!.pool.query(
        `UPDATE event SET status = 'processing', started_at = now() - interval '10 minutes'
          WHERE name = 'import_job_requested'`
      );
      await core!.importDispatch();
      expect(await pendingRequests()).toHaveLength(2);
    } finally {
      await cleanUp();
    }
  });

  it('importRecover interrupts the job of a worker killed with SIGKILL, and Resume finishes it with no duplicate', async () => {
    await cleanUp();
    await remember();
    try {
      const s = service();
      const keys = Array.from(
        { length: 600 },
        (_, n) => `kill-${String(n).padStart(3, '0')}`
      );
      const { job } = await upload(s, categoryFile(...keys.map((k) => row(k))));
      await core!.subscriber((await takeRequests())[0]);
      await until(async () => (await statusOf(job.id))?.status === 'validated');
      await s.start(job.id);
      await core!.subscriber((await takeRequests())[0]);
      await until(
        async () => ((await statusOf(job.id))?.counts.lastUnit ?? 0) > 0,
        60_000
      );
      const running = (await statusOf(job.id))!;
      process.kill(Number(running.worker!.split(':').pop()), 'SIGKILL');
      await until(() => core!.dispatchDeps().workers.running() === 0, 30_000);

      // The worker is dead but its last heartbeat is recent: not yet.
      await core!.importRecover();
      expect((await statusOf(job.id))!.status).toBe('running');

      await backdate(job.id, 'heartbeat_at', '3 minutes');
      await core!.importRecover();
      const stopped = (await statusOf(job.id))!;
      expect(stopped.status).toBe('interrupted');
      expect(stopped.errorMessage).toMatch(/did not report for 120 seconds/);
      expect(stopped.startedAt).not.toBeNull();
      // The retention follows the configuration: 2 days, not the default 7.
      expect(stopped.expiresAt! - Date.now()).toBeGreaterThan(
        2 * 86_400_000 - 120_000
      );
      expect(stopped.expiresAt! - Date.now()).toBeLessThan(
        2 * 86_400_000 + 120_000
      );
      expect(stopped.counts.created).toBeLessThan(600);

      // The slot of the one import at a time is free, and Resume works.
      await s.resume(job.id);
      await core!.subscriber((await takeRequests())[0]);
      await until(async () => (await statusOf(job.id))?.status === 'completed');
      const done = (await statusOf(job.id))!;
      expect(done.counts).toMatchObject({ failed: 0, skipped: 0 });
      // What the dead worker wrote after its last save is written again as updates.
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

      // importCleanup: the job ended clean, so its file goes and the job stays.
      const chunks = () =>
        db!.pool.query(
          'SELECT count(*)::int AS n FROM import_job_file WHERE import_job_id = $1',
          [job.id]
        );
      expect((await chunks()).rows[0].n).toBeGreaterThan(0);
      await core!.importCleanup();
      expect((await chunks()).rows[0].n).toBe(0);
      expect((await statusOf(job.id))!.status).toBe('completed');
    } finally {
      await cleanUp();
    }
  });

  it('importCleanup deletes an abandoned upload and an expired job, and leaves a live upload', async () => {
    await cleanUp();
    await remember();
    try {
      const made = async (
        status: string,
        heartbeat: string | null,
        expires: string | null
      ) =>
        (
          await db!.pool.query(
            `INSERT INTO import_job (entity, status, file_name, heartbeat_at, expires_at)
             VALUES ('category', $1, 'f.csv',
                     CASE WHEN $2::text IS NULL THEN NULL ELSE now() - $2::interval END,
                     CASE WHEN $3::text IS NULL THEN NULL ELSE now() + $3::interval END)
             RETURNING import_job_id AS id`,
            [status, heartbeat, expires]
          )
        ).rows[0].id as number;
      const idle = await made('uploading', '11 minutes', null);
      const live = await made('uploading', '1 minute', null);
      const expired = await made('validated', null, '-1 minute');
      await core!.importCleanup();
      expect(await statusOf(idle)).toBeNull();
      expect(await statusOf(expired)).toBeNull();
      expect(await statusOf(live)).not.toBeNull();
    } finally {
      await cleanUp();
    }
  });
});

describeDb('CoreJobRequests.inFlight: the requests on their way', () => {
  const A = '11111111-2222-4333-8444-555555555555';
  const B = '66666666-7777-4888-8999-aaaaaaaaaaaa';
  const C = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';

  const event = (
    name: string,
    jobUuid: string,
    status: string,
    startedAgo: string | null
  ) =>
    db!.pool.query(
      `INSERT INTO event (name, data, status, started_at)
       VALUES ($1, $2::json, $3,
               CASE WHEN $4::text IS NULL THEN NULL ELSE now() - $4::interval END)`,
      [name, JSON.stringify({ jobUuid }), status, startedAgo]
    );

  it('counts an event that is pending or recently processing, and no other', async () => {
    await cleanUp();
    await remember();
    try {
      const requests = new core!.CoreJobRequests(
        core!.pool,
        new CollectingLogger()
      );
      await event('import_job_requested', A, 'pending', null);
      await event('import_job_requested', B, 'processing', '1 minute');
      await event('import_job_requested', C, 'processing', '10 minutes');
      expect(await requests.inFlight([A, B, C])).toEqual(new Set([A, B]));

      await cleanUp();
      await remember();
      await event('import_job_requested', A, 'failed', '1 minute');
      await event('some_other_event', B, 'pending', null);
      expect(await requests.inFlight([A, B, C])).toEqual(new Set());
    } finally {
      await cleanUp();
    }
  });

  it('answers for the jobs it is asked about only, in any case, and for none without asking the database', async () => {
    await cleanUp();
    await remember();
    try {
      const requests = new core!.CoreJobRequests(
        core!.pool,
        new CollectingLogger()
      );
      await event('import_job_requested', A, 'pending', null);
      await event('import_job_requested', B, 'pending', null);
      expect(await requests.inFlight([A])).toEqual(new Set([A]));
      // The uuid of A is all digits; B has letters, which have a case.
      expect(await requests.inFlight([B.toUpperCase()])).toEqual(new Set([B]));
      expect(await requests.inFlight([])).toEqual(new Set());
      // Two requests for one job are one job.
      await event('import_job_requested', A, 'pending', null);
      expect(await requests.inFlight([A, B])).toEqual(new Set([A, B]));
    } finally {
      await cleanUp();
    }
  });
});

describeDb(
  'the import slows down for the event queue (§ 8.5), with real workers and real events',
  () => {
    const ROWS = 800;
    const bulk = Array.from(
      { length: ROWS },
      (_, n) => `queue-${String(n).padStart(3, '0')}`
    );
    const pause = (ms: number) =>
      new Promise((resolve) => {
        setTimeout(resolve, ms);
      });

    /** The settings of the worker processes that the next events start. */
    const settings = (values: Record<string, number>) => {
      process.env.NODE_CONFIG = JSON.stringify({ system: { import: values } });
    };
    const count = async (sql: string, above: number) =>
      Number((await db!.pool.query(sql, [above])).rows[0].n);
    const written = () =>
      count(
        'SELECT count(*)::int AS n FROM category WHERE category_id > $1',
        baseline.category
      );
    const waitingEvents = () =>
      count(
        `SELECT count(*)::int AS n FROM event
        WHERE event_id > $1 AND name <> 'import_job_requested'`,
        baseline.event
      );
    /** The event process, as far as the queue goes: it takes the events the import wrote. */
    const drainQueue = () =>
      db!.pool.query(
        `DELETE FROM event WHERE event_id > $1 AND name <> 'import_job_requested'`,
        [baseline.event]
      );

    /** Uploads the file, has it checked, starts it, and starts the worker that imports it. */
    async function startImport(s: ImportService) {
      const { job } = await upload(s, categoryFile(...bulk.map((k) => row(k))));
      await core!.subscriber((await takeRequests())[0]);
      await until(async () => (await statusOf(job.id))?.status === 'validated');
      await s.start(job.id);
      await core!.subscriber((await takeRequests())[0]);
      return job;
    }

    it('stops writing while the queue is long, shows that it waits, keeps its heartbeat, and goes on when the queue has drained', async () => {
      await cleanUp();
      await remember();
      settings({ eventBacklogHigh: 10, eventBacklogLow: 3 });
      try {
        const s = service();
        const job = await startImport(s);

        // Nobody takes the events, so the queue only grows: the worker waits.
        await until(
          async () => (await statusOf(job.id))?.waitingSince != null,
          60_000
        );
        const waiting = (await statusOf(job.id))!;
        expect(waiting.status).toBe('running');
        const rows = await written();
        expect(rows).toBeGreaterThan(10);
        expect(rows).toBeLessThan(ROWS);
        expect(await waitingEvents()).toBeGreaterThan(10);

        // It writes nothing while it waits, it is the same wait, and it is alive.
        await pause(2500);
        expect(await written()).toBe(rows);
        const later = (await statusOf(job.id))!;
        expect(later.status).toBe('running');
        expect(later.waitingSince).toBe(waiting.waitingSince);
        expect(later.heartbeatAt).toBeGreaterThan(
          waiting.heartbeatAt as number
        );

        // The event process catches up in bursts, as it does on a store.
        await until(async () => {
          await drainQueue();
          return (await statusOf(job.id))?.status === 'completed';
        }, 120_000);
        const done = (await statusOf(job.id))!;
        expect(done).toMatchObject({
          waitingSince: null,
          counts: { created: ROWS, failed: 0, skipped: 0 }
        });
        const made = await db!.pool.query(
          `SELECT count(*)::int AS n, count(DISTINCT cd.url_key)::int AS keys
           FROM category c
           JOIN category_description cd ON cd.category_description_category_id = c.category_id
          WHERE c.category_id > $1`,
          [baseline.category]
        );
        expect(made.rows[0]).toEqual({ n: ROWS, keys: ROWS });
        await until(() => core!.dispatchDeps().workers.running() === 0, 30_000);
      } finally {
        process.env.NODE_CONFIG = NO_BACKPRESSURE;
        await cleanUp();
      }
    });

    it('gives up when the queue does not drain, ends the job interrupted with the reason, and a resume goes on without a duplicate', async () => {
      await cleanUp();
      await remember();
      // Six seconds is the longest the worker waits.
      settings({
        eventBacklogHigh: 10,
        eventBacklogLow: 3,
        eventBacklogMaxWaitMinutes: 0.1
      });
      try {
        const s = service();
        const job = await startImport(s);
        await until(
          async () => (await statusOf(job.id))?.status === 'interrupted',
          90_000
        );
        const stopped = (await statusOf(job.id))!;
        expect(stopped.errorMessage).toBe(
          'The event process is not draining: more than 10 events were waiting for 0.1 minutes. Find out why events are not processed, then resume the import.'
        );
        expect(stopped.waitingSince).toBeNull();
        expect(stopped.startedAt).not.toBeNull();
        expect(stopped.counts.created).toBeGreaterThan(10);
        expect(stopped.counts.created).toBeLessThan(ROWS);
        expect(stopped.counts.lastUnit).toBe(stopped.counts.created);
        expect(await written()).toBe(stopped.counts.created);
        await until(() => core!.dispatchDeps().workers.running() === 0, 30_000);

        // The event process is back; the admin resumes the job.
        await drainQueue();
        await s.resume(job.id);
        await core!.subscriber((await takeRequests())[0]);
        await until(async () => {
          await drainQueue();
          return (await statusOf(job.id))?.status === 'completed';
        }, 120_000);
        const done = (await statusOf(job.id))!;
        expect(done.counts).toMatchObject({ failed: 0, skipped: 0 });
        expect(done.counts.created + done.counts.updated).toBe(ROWS);
        expect(done.attempt).toBe(3);
        const made = await db!.pool.query(
          `SELECT count(*)::int AS n, count(DISTINCT cd.url_key)::int AS keys
           FROM category c
           JOIN category_description cd ON cd.category_description_category_id = c.category_id
          WHERE c.category_id > $1`,
          [baseline.category]
        );
        expect(made.rows[0]).toEqual({ n: ROWS, keys: ROWS });
        await until(() => core!.dispatchDeps().workers.running() === 0, 30_000);
      } finally {
        process.env.NODE_CONFIG = NO_BACKPRESSURE;
        await cleanUp();
      }
    });
  }
);

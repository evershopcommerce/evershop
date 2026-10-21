import { createHash } from 'crypto';
import http from 'http';
import type { AddressInfo } from 'net';
import { afterAll, describe, expect, it, jest } from '@jest/globals';
import { PgFileStore } from '../../../adapters/PgFileStore.js';
import { PgJobAdmin } from '../../../adapters/PgJobAdmin.js';
import { nodeSha256 } from '../../../adapters/nodeSha256.js';
import { PgJobRepository } from '../../../adapters/PgJobRepository.js';
import { FileDamagedError } from '../../../services/job/errors.js';
import { ImportService } from '../../../services/jobs/ImportService.js';
import { emptyCounts } from '../../../services/job/types.js';
import type { StoredIssue } from '../../../services/job/types.js';
import {
  cancelJob,
  deleteJob,
  downloadFileWithErrors,
  downloadImportTemplate,
  getIssues,
  getJob,
  startJob
} from '../../../web/handlers.js';
import type { ImportWeb } from '../../../web/ImportWeb.js';
import { pgTemplate } from '../../../web/pgTemplate.js';
import { uploadJob } from '../../../web/upload.js';
import { registerAddressField } from '../../../../../lib/address/extras.js';
import {
  configureAddressRuntime,
  resetAddressRuntime
} from '../../../../../lib/address/runtime.js';
import { ADDRESS_SETTINGS_DEFAULTS } from '../../../../../lib/address/settings.js';
import { EventStorage } from '../../../../../lib/event/EventStorage.js';
import { addProcessor } from '../../../../../lib/util/registry.js';
import { normalizeAddressInput } from '../../../../customer/services/customer/address/normalizeAddressInput.js';
import { eventBacklogContract } from '../helpers/eventBacklogContract.js';
import { fileStoreContract } from '../helpers/fileStoreContract.js';
import { jobAdminContract } from '../helpers/jobAdminContract.js';
import { jobMaintenanceContract } from '../helpers/jobMaintenanceContract.js';
import { jobRepositoryContract } from '../helpers/jobRepositoryContract.js';
import { lookupContract } from '../helpers/lookupContract.js';
import {
  pgAdminHarness,
  pgEventHarness,
  pgFileHarness,
  pgJobHarness,
  pgLookupHarness,
  pgMaintenanceHarness
} from '../helpers/pgHarnesses.js';
import { multipart, postTo } from '../helpers/multipartClient.js';
import { openScratchDb } from '../helpers/scratchDb.js';
import { bodyOf, textOf } from '../helpers/webHarness.js';

/**
 * The PostgreSQL adapters of the import, on a scratch database (see
 * `helpers/scratchDb.ts`). Everything is in one file so that one worker owns the
 * test schema. Without a reachable database the suite skips; with `CI` set it
 * fails.
 */
jest.setTimeout(30_000);

const db = await openScratchDb();
const describeDb = db ? describe : describe.skip;

afterAll(async () => {
  await db?.close();
});

describeDb('the import tables (migration Version-1.0.0)', () => {
  const pool = () => db!.pool;
  const clean = () =>
    pool().query('TRUNCATE import_job RESTART IDENTITY CASCADE');
  const job = (status: string, entity = 'category') =>
    pool().query(
      `INSERT INTO import_job (entity, status, file_name)
       VALUES ($1, $2, 'f.csv') RETURNING import_job_id`,
      [entity, status]
    );

  it('puts the tables in the test schema and nowhere else', async () => {
    // A store may run on this database and have its own `public.import_job`
    // (its migration ran): the test's table is then another table, not none.
    const found = await pool().query(
      `SELECT (SELECT n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.oid = to_regclass('import_job')) AS schema,
              to_regclass('import_job')::oid::text AS used,
              to_regclass('public.import_job')::oid::text AS in_public`
    );
    expect(found.rows[0].schema).toBe(db!.schema);
    expect(found.rows[0].used).not.toBeNull();
    expect(found.rows[0].used).not.toBe(found.rows[0].in_public);
  });

  it('refuses a status, an entity and a mode that do not exist', async () => {
    await clean();
    await expect(job('nearly')).rejects.toThrow('IMPORT_JOB_STATUS_CHECK');
    await expect(job('uploaded', 'order')).rejects.toThrow(
      'IMPORT_JOB_ENTITY_CHECK'
    );
    await expect(
      pool().query(
        `INSERT INTO import_job (entity, mode, file_name) VALUES ('category', 'merge', 'f.csv')`
      )
    ).rejects.toThrow('IMPORT_JOB_MODE_CHECK');
  });

  it('allows one open job for an entity, and any number that are not open', async () => {
    await clean();
    await job('uploaded');
    await expect(job('validated')).rejects.toThrow(
      'IMPORT_JOB_ONE_OPEN_PER_ENTITY'
    );
    await job('validated', 'product');
    // A file that is still arriving, and jobs that are over, block nothing.
    await job('uploading');
    await job('uploading');
    await job('completed');
    await job('failed');
    await job('canceled');
    await job('stopped');
  });

  it('allows one import queued or running in the whole store', async () => {
    await clean();
    await job('queued', 'category');
    await expect(job('running', 'product')).rejects.toThrow(
      'IMPORT_JOB_ONE_IMPORT_AT_A_TIME'
    );
    await expect(job('queued', 'customer')).rejects.toThrow(
      'IMPORT_JOB_ONE_IMPORT_AT_A_TIME'
    );
    await job('validated', 'product');
  });

  it('refuses a chunk of more than 1 MiB, and a chunk number used twice', async () => {
    await clean();
    const { import_job_id: id } = (await job('uploading')).rows[0];
    const add = (seq: number, size: number) =>
      pool().query(
        `INSERT INTO import_job_file (import_job_id, seq, data) VALUES ($1, $2, $3)`,
        [id, seq, Buffer.alloc(size, 1)]
      );
    await add(0, 1_048_576);
    await expect(add(1, 1_048_577)).rejects.toThrow(
      'IMPORT_JOB_FILE_SIZE_CHECK'
    );
    await expect(add(0, 10)).rejects.toThrow('IMPORT_JOB_FILE_SEQ_UNIQUE');
  });

  it('refuses a problem with a phase or a severity that does not exist', async () => {
    await clean();
    const { import_job_id: id } = (await job('uploaded')).rows[0];
    const add = (phase: string, severity: string) =>
      pool().query(
        `INSERT INTO import_job_issue (import_job_id, phase, code, severity, message)
         VALUES ($1, $2, 'X', $3, 'm')`,
        [id, phase, severity]
      );
    await expect(add('later', 'error')).rejects.toThrow(
      'IMPORT_JOB_ISSUE_PHASE_CHECK'
    );
    await expect(add('import', 'fatal')).rejects.toThrow(
      'IMPORT_JOB_ISSUE_SEVERITY_CHECK'
    );
    await add('import', 'warning');
  });

  it('removes the chunks and the problems with the job', async () => {
    await clean();
    const { import_job_id: id } = (await job('uploaded')).rows[0];
    await pool().query(
      `INSERT INTO import_job_file (import_job_id, seq, data) VALUES ($1, 0, $2)`,
      [id, Buffer.from('a')]
    );
    await pool().query(
      `INSERT INTO import_job_issue (import_job_id, phase, code, severity, message)
       VALUES ($1, 'validate', 'X', 'error', 'm')`,
      [id]
    );
    await pool().query('DELETE FROM import_job WHERE import_job_id = $1', [id]);
    const left = await pool().query(
      `SELECT (SELECT count(*) FROM import_job_file)::int AS files,
              (SELECT count(*) FROM import_job_issue)::int AS issues`
    );
    expect(left.rows[0]).toEqual({ files: 0, issues: 0 });
  });
});

describeDb('PgJobRepository', () => {
  jobRepositoryContract('PgJobRepository', () => pgJobHarness(db!));

  describe('what only a database can show', () => {
    const issue = (fields: Partial<StoredIssue> = {}): StoredIssue => ({
      phase: 'validate',
      rowNumber: 2,
      entityKey: 'k',
      column: 'status',
      code: 'INVALID_VALUE',
      severity: 'error',
      params: {},
      message: 'm',
      value: null,
      ...fields
    });
    const claimed = async () => {
      const h = await pgJobHarness(db!);
      const job = await h.insert();
      const attempt = (await h.repo.claim(
        job.id,
        'uploaded',
        'validating',
        'host:1'
      )) as number;
      return { h, id: job.id, attempt };
    };

    it('writes a checkpoint whole or not at all', async () => {
      const { h, id, attempt } = await claimed();
      await h.repo.checkpoint(id, attempt, {
        counts: { ...emptyCounts(), total: 1 },
        issues: [issue()]
      });
      const before = await h.snapshot(id);
      await expect(
        h.repo.checkpoint(id, attempt, {
          counts: { ...emptyCounts(), total: 99 },
          stage: 'reading',
          // The second problem breaks a constraint of the table.
          issues: [issue(), issue({ severity: 'fatal' as 'error' })]
        })
      ).rejects.toThrow('IMPORT_JOB_ISSUE_SEVERITY_CHECK');
      expect(await h.snapshot(id)).toEqual(before);
      expect(await h.issues(id)).toHaveLength(1);
      // The connection went back to the pool in a clean state.
      expect(
        await h.repo.checkpoint(id, attempt, {
          counts: emptyCounts(),
          issues: []
        })
      ).toEqual({ ok: true, control: null });
    });

    it('stores a problem that holds U+0000, which PostgreSQL text cannot', async () => {
      const { h, id, attempt } = await claimed();
      await h.repo.checkpoint(id, attempt, {
        counts: emptyCounts(),
        issues: [
          issue({
            entityKey: 'a\u0000b',
            column: 'c\u0000',
            message: 'm\u0000m',
            value: 'v\u0000',
            params: { cell: 'x\u0000y', list: ['\u0000'], 'key\u0000': 1 }
          })
        ]
      });
      expect((await h.issues(id))[0]).toEqual(
        issue({
          entityKey: 'a�b',
          column: 'c�',
          message: 'm�m',
          value: 'v�',
          params: { cell: 'x�y', list: ['�'], 'key�': 1 }
        })
      );
    });

    it('keeps the text "\\u0000" of a cell as the six characters it is', async () => {
      const { h, id, attempt } = await claimed();
      const six = String.raw`\u0000 and \\u0000`;
      await h.repo.checkpoint(id, attempt, {
        counts: emptyCounts(),
        issues: [issue({ params: { cell: six } })]
      });
      expect((await h.issues(id))[0].params).toEqual({ cell: six });
    });

    it('cuts a value to the 200 characters of the column', async () => {
      const { h, id, attempt } = await claimed();
      await h.repo.checkpoint(id, attempt, {
        counts: emptyCounts(),
        issues: [issue({ value: 'x'.repeat(500) })]
      });
      expect((await h.issues(id))[0].value).toBe('x'.repeat(200));
    });

    it('completes the counts that an older or newer writer left out', async () => {
      const { h, id } = await claimed();
      await db!.pool.query(
        `UPDATE "${
          db!.schema
        }".import_job SET counts = $2::jsonb WHERE import_job_id = $1`,
        [
          id,
          JSON.stringify({ total: 3, byCode: { validate: { A: 1 } }, extra: 7 })
        ]
      );
      const counts = (await h.repo.get(id))!.counts;
      expect(counts).toMatchObject({
        total: 3,
        errors: 0,
        byCode: { validate: { A: 1 }, import: {} },
        issuesTruncated: { validate: false, import: false },
        firstUnlistedRow: { validate: null, import: null }
      });
    });

    it('keeps a finished job for the time it is told to', async () => {
      const h = await pgJobHarness(
        db!,
        new PgJobRepository(db!.pool, { retentionMs: 60_000 })
      );
      const job = await h.insert();
      const attempt = (await h.repo.claim(
        job.id,
        'uploaded',
        'validating',
        'a'
      )) as number;
      const before = Date.now();
      await h.repo.finish(job.id, attempt, 'validated');
      const expires = (await h.snapshot(job.id)).expiresAt as number;
      expect(expires).toBeGreaterThanOrEqual(before + 60_000);
      expect(expires).toBeLessThan(before + 70_000);
    });

    it('sets validated_at when a run ends in validated, and status_changed_at at every change', async () => {
      const { h, id, attempt } = await claimed();
      const read = () =>
        db!.pool.query(
          `SELECT validated_at, status_changed_at, created_at
             FROM "${db!.schema}".import_job WHERE import_job_id = $1`,
          [id]
        );
      const claimedAt = (await read()).rows[0];
      expect(claimedAt.validated_at).toBeNull();
      await h.advance(20);
      await h.repo.finish(id, attempt, 'validated');
      const done = (await read()).rows[0];
      expect(done.validated_at).not.toBeNull();
      expect(done.status_changed_at.getTime()).toBeGreaterThan(
        claimedAt.status_changed_at.getTime()
      );
    });
  });
});

describeDb('PgJobMaintenance', () => {
  jobMaintenanceContract('PgJobMaintenance', () => pgMaintenanceHarness(db!));

  it('leaves a job that a live worker is writing at that moment for the next round, and does not wait for it', async () => {
    const h = await pgMaintenanceHarness(db!);
    const stale = Date.now() - 3 * 60_000;
    const held = await h.insert({
      entity: 'category',
      status: 'running',
      heartbeatAt: stale,
      startedAt: stale
    });
    const free = await h.insert({
      entity: 'product',
      status: 'validating',
      heartbeatAt: stale
    });
    // A worker is in the middle of a checkpoint: its transaction holds the row.
    const client = await db!.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'SELECT 1 FROM import_job WHERE import_job_id = $1 FOR UPDATE',
        [held.id]
      );
      const started = Date.now();
      const recovered = await h.maintenance.recoverDead(120_000, 'it died');
      expect(Date.now() - started).toBeLessThan(5000);
      // Only the free one was taken; the other is not touched, and not waited for.
      expect(recovered.map((job) => job.uuid)).toEqual([free.uuid]);
      expect((await h.snapshot(held.id)).status).toBe('running');
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
    // The next round takes it.
    expect(
      (await h.maintenance.recoverDead(120_000, 'it died')).map(
        (job) => job.uuid
      )
    ).toEqual([held.uuid]);
  });

  it('lets two rounds on two instances share the dead jobs without taking one twice', async () => {
    const h = await pgMaintenanceHarness(db!);
    const stale = Date.now() - 3 * 60_000;
    const entities = [
      'category',
      'product',
      'customer',
      'customerAddress'
    ] as const;
    for (const entity of entities) {
      // eslint-disable-next-line no-await-in-loop
      await h.insert({ entity, status: 'validating', heartbeatAt: stale });
    }
    const [first, second] = await Promise.all([
      h.maintenance.recoverDead(120_000, 'it died'),
      h.maintenance.recoverDead(120_000, 'it died')
    ]);
    const all = [...first, ...second].map((job) => job.uuid);
    expect(all).toHaveLength(4);
    expect(new Set(all).size).toBe(4);
  });
});

describeDb('PgJobAdmin', () => {
  jobAdminContract('PgJobAdmin', () => pgAdminHarness(db!));

  describe('the import service on PostgreSQL', () => {
    const sha = (bytes: Buffer) =>
      createHash('sha256').update(bytes).digest('hex');
    const setup = async (options: { retentionMs?: number } = {}) => {
      const h = await pgAdminHarness(db!, new PgJobAdmin(db!.pool, options));
      const service = new ImportService({
        jobs: h.admin,
        sha256: nodeSha256,
        maxFileBytes: 50 * 1_048_576
      });
      return { h, service };
    };
    async function* pieces(bytes: Buffer, size: number) {
      for (let at = 0; at < bytes.length; at += size) {
        yield bytes.subarray(at, at + size);
      }
    }
    const upload = (
      service: ImportService,
      file: AsyncIterable<Buffer>,
      entity = 'category'
    ) => service.upload({ entity, fileName: 'f.csv', createdBy: null, file });

    it('uploads a file of several real chunks, and the file store reads it back whole', async () => {
      const { service } = await setup();
      const bytes = Buffer.alloc(2_621_440 + 123);
      for (let at = 0; at < bytes.length; at += 1) bytes[at] = (at * 7) % 253;
      // The pieces of the stream are not the size of a chunk.
      const { job } = await upload(service, pieces(bytes, 100_003));
      expect(job).toMatchObject({
        status: 'uploaded',
        fileSize: bytes.length,
        chunkCount: 3,
        fileSha256: sha(bytes)
      });
      const read: Buffer[] = [];
      // The check of the file store (count, size, SHA-256) passes on what the upload recorded.
      for await (const chunk of new PgFileStore(db!.pool).open(job.id)) {
        read.push(Buffer.from(chunk));
      }
      expect(read.map((c) => c.length)).toEqual([
        1_048_576,
        1_048_576,
        524_288 + 123
      ]);
      expect(Buffer.concat(read).equals(bytes)).toBe(true);
    });

    it('leaves nothing behind when the stream breaks after the first chunk', async () => {
      const { h, service } = await setup();
      async function* dropped() {
        yield Buffer.alloc(1_500_000, 1);
        throw new Error('socket hang up');
      }
      await expect(upload(service, dropped())).rejects.toThrow(
        'socket hang up'
      );
      const left = await db!.pool.query(
        `SELECT (SELECT count(*) FROM import_job)::int AS jobs,
                (SELECT count(*) FROM import_job_file)::int AS chunks`
      );
      expect(left.rows[0]).toEqual({ jobs: 0, chunks: 0 });
      expect(await h.admin.listOpen()).toEqual([]);
    });

    it('stops a file that is too large, and leaves nothing behind', async () => {
      const { h } = await setup();
      const small = new ImportService({
        jobs: h.admin,
        sha256: nodeSha256,
        maxFileBytes: 1_500_000
      });
      await expect(
        upload(small, pieces(Buffer.alloc(3_000_000, 2), 65_536))
      ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
      const left = await db!.pool.query(
        `SELECT (SELECT count(*) FROM import_job)::int AS jobs,
                (SELECT count(*) FROM import_job_file)::int AS chunks`
      );
      expect(left.rows[0]).toEqual({ jobs: 0, chunks: 0 });
    });

    it('is refused, and costs nothing, when the import became busy while the file arrived', async () => {
      const { h, service } = await setup();
      const old = await h.insert({ entity: 'category', status: 'validated' });
      // The index of one open job per entity refuses a running job beside the
      // validated one, so the busy import is set up by moving that one.
      async function* moveOldToRunning() {
        yield Buffer.from('a,b\n1,2\n');
        await h.setStatus(old.id, 'running');
      }
      await expect(upload(service, moveOldToRunning())).rejects.toMatchObject({
        code: 'IMPORT_RUNNING'
      });
      expect((await h.admin.get(old.id))?.status).toBe('running');
      const jobs = await db!.pool.query('SELECT status FROM import_job');
      expect(jobs.rows).toEqual([{ status: 'running' }]);
    });

    it('swaps whole or not at all: a failure at the last step brings the old job back', async () => {
      const { h, service } = await setup();
      const old = await h.insert({ entity: 'category', status: 'validated' });
      await h.seedChunks(old.id, [Buffer.from('old file')]);
      await h.seedIssues(old.id, [
        {
          phase: 'validate',
          rowNumber: 2,
          entityKey: null,
          column: null,
          code: 'X',
          severity: 'error',
          params: {},
          message: 'm',
          value: null
        }
      ]);
      const schema = `"${db!.schema}"`;
      // The last step of the swap makes the new job uploaded: make that fail.
      await db!.pool.query(`
        CREATE FUNCTION ${schema}.refuse_uploaded() RETURNS trigger AS $$
        BEGIN
          IF NEW.status = 'uploaded' AND OLD.status = 'uploading' THEN
            RAISE EXCEPTION 'the last step failed';
          END IF;
          RETURN NEW;
        END; $$ LANGUAGE plpgsql`);
      await db!.pool.query(`
        CREATE TRIGGER refuse_uploaded BEFORE UPDATE ON ${schema}.import_job
        FOR EACH ROW EXECUTE FUNCTION ${schema}.refuse_uploaded()`);
      try {
        await expect(
          upload(service, pieces(Buffer.from('new,file\n'), 4))
        ).rejects.toThrow('the last step failed');
      } finally {
        await db!.pool.query(
          `DROP TRIGGER refuse_uploaded ON ${schema}.import_job`
        );
        await db!.pool.query(`DROP FUNCTION ${schema}.refuse_uploaded()`);
      }
      // The old job, its file and its problems are all still there; the new one is gone.
      expect((await h.admin.get(old.id))?.status).toBe('validated');
      expect(await h.chunksOf(old.id)).toHaveLength(1);
      expect(await h.issues(old.id)).toHaveLength(1);
      const jobs = await db!.pool.query('SELECT import_job_id FROM import_job');
      expect(jobs.rows).toEqual([{ import_job_id: old.id }]);
    });

    it('keeps a job for the time it is told to', async () => {
      const { service } = await setup({ retentionMs: 60_000 });
      const before = Date.now();
      const { job } = await upload(service, pieces(Buffer.from('a\n1\n'), 2));
      expect(job.expiresAt).toBeGreaterThanOrEqual(before + 60_000);
      expect(job.expiresAt).toBeLessThan(before + 70_000);
    });
  });
});

describeDb('the web layer on PostgreSQL', () => {
  const build = async () => {
    const h = await pgAdminHarness(db!);
    const repository = new PgJobRepository(db!.pool);
    const web: ImportWeb = {
      service: new ImportService({
        jobs: h.admin,
        sha256: nodeSha256,
        maxFileBytes: 50 * 1_048_576
      }),
      files: new PgFileStore(db!.pool),
      issuesInRowOrder: (jobId, phase) =>
        repository.issuesInRowOrder(jobId, phase),
      adminNames: async () => new Map([[7, 'Jane Doe']]),
      template: pgTemplate(db!.pool),
      limits: { maxRows: 200_000, maxCellLength: 65_536 },
      logger: { info: () => {}, warn: () => {}, error: () => {} }
    };
    return { h, web };
  };

  it('gives a template made for the store: its attributes and custom fields are columns, read from the tables', async () => {
    const { web } = await build();
    const seed = await pgLookupHarness(db!);
    await seed.set({
      attributes: [
        { code: 'size', type: 'select', options: ['S'] },
        { code: 'color', type: 'select', options: ['Black'] }
      ],
      metafields: {
        product: ['custom.material'],
        customer: ['custom.birthday'],
        category: []
      }
    });
    const header = async (which: string) =>
      (await textOf(await downloadImportTemplate(web, which))).split(
        /\r?\n/
      )[0];
    expect(await header('products')).toMatch(
      /redirect_from,attr:color,attr:size,metafield:custom\.material$/
    );
    expect(await header('customers')).toMatch(
      /password,metafield:custom\.birthday$/
    );
    expect(await header('categories')).toMatch(/image$/);
    expect(await header('customer-addresses')).toMatch(
      /^.email,recipient,organization,/
    );
    await seed.set({});
  });

  it('takes an upload over HTTP, shows the job, and gives the file back with its problems', async () => {
    const { h, web } = await build();
    const server = http.createServer((request, response) => {
      uploadJob(web, request, response, null).then((result) => {
        response.statusCode = result.status;
        response.end(JSON.stringify((result as { body: unknown }).body));
      });
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address() as AddressInfo;
    const content = Buffer.from('url_key,name\nwomen,Women\nmen,Men\n');
    try {
      const answer = await postTo(
        port,
        multipart([
          { name: 'entity', value: 'category' },
          { name: 'mode', value: 'create' },
          { name: 'file', filename: 'sản phẩm.csv', content }
        ])
      );
      expect(answer.status).toBe(200);
      expect(answer.body.data).toMatchObject({
        status: 'uploaded',
        fileName: 'sản phẩm.csv',
        fileSize: content.length,
        replaced: false
      });
      const { uuid } = answer.body.data;

      // The job, by its uuid.
      expect(bodyOf(await getJob(web, uuid)).data.uuid).toBe(uuid);
      expect(await getJob(web, 'open')).toMatchObject({ status: 404 });

      // The problems, then the file with them.
      const job = (await h.admin.getByUuid(uuid))!;
      await h.seedIssues(job.id, [
        {
          phase: 'validate',
          rowNumber: 3,
          entityKey: 'men',
          column: 'name',
          code: 'INVALID_VALUE',
          severity: 'error',
          params: {},
          message: 'The name is wrong.',
          value: 'Men'
        }
      ]);
      const page = bodyOf(await getIssues(web, uuid, {})).data;
      expect(page.total).toBe(1);
      expect(page.items[0]).toMatchObject({
        row: 3,
        key: 'men',
        code: 'INVALID_VALUE'
      });
      const download = await downloadFileWithErrors(web, uuid, {});
      expect(await textOf(download)).toBe(
        '\uFEFFurl_key,name,_errors\r\nwomen,Women,\r\nmen,Men,name: The name is wrong.\r\n'
      );

      // The actions.
      expect(bodyOf(await startJob(web, uuid)).error.code).toBe('WRONG_STATUS');
      await h.setStatus(job.id, 'validated');
      expect(bodyOf(await startJob(web, uuid)).data.status).toBe('queued');
      expect(bodyOf(await cancelJob(web, uuid)).data).toMatchObject({
        status: 'canceled',
        cancel: 'canceled'
      });
      expect(bodyOf(await deleteJob(web, uuid)).data.uuid).toBe(uuid);
      expect(await h.chunksOf(job.id)).toEqual([]);
      expect(await getJob(web, uuid)).toMatchObject({ status: 404 });
    } finally {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
  });
});

describeDb('PgFileStore', () => {
  fileStoreContract('PgFileStore', () => pgFileHarness(db!));

  it('says that the upload is not complete when no size and hash are recorded', async () => {
    const h = await pgFileHarness(db!);
    const id = await h.stageIncomplete();
    await expect(
      (async () => {
        for await (const chunk of h.store.open(id))
          expect(chunk).toBeUndefined();
      })()
    ).rejects.toThrow('not complete');
  });

  it('fails, and does not end quietly, when the job is deleted while its file is being read', async () => {
    const h = await pgFileHarness(db!);
    const id = await h.stage('a,b\n1,2\n3,4\n', 4);
    // After the check has counted the chunks, the job (and its chunks) goes.
    const pool = new Proxy(db!.pool, {
      get(target, property, receiver) {
        if (property !== 'query')
          return Reflect.get(target, property, receiver);
        return async (text: string, params: unknown[]) => {
          const result = await target.query(text, params);
          if (/count\(\*\)/.test(text)) {
            await target.query(
              'DELETE FROM import_job WHERE import_job_id = $1',
              [id]
            );
          }
          return result;
        };
      }
    });
    const chunks: Buffer[] = [];
    await expect(
      (async () => {
        for await (const chunk of new PgFileStore(pool).open(id)) {
          chunks.push(Buffer.from(chunk));
        }
      })()
    ).rejects.toBeInstanceOf(FileDamagedError);
    expect(chunks).toEqual([]);
  });

  it('reads a file of several chunks of the real size', async () => {
    const h = await pgFileHarness(db!);
    const bytes = Buffer.alloc(2_621_440 + 17);
    for (let at = 0; at < bytes.length; at += 1) bytes[at] = (at * 31) % 251;
    const id = await h.stage(bytes);
    const chunks: Buffer[] = [];
    for await (const chunk of h.store.open(id)) chunks.push(Buffer.from(chunk));
    expect(chunks.map((c) => c.length)).toEqual([
      1_048_576,
      1_048_576,
      524_288 + 17
    ]);
    expect(Buffer.concat(chunks).equals(bytes)).toBe(true);
  });
});

describeDb('PgLookup', () => {
  // The customer module registers its normalizer on the seam when it boots.
  addProcessor('customerAddressDataBeforeCreate', normalizeAddressInput, 0);
  lookupContract('PgLookup', () => pgLookupHarness(db!));

  it('runs the processors of the seam, whatever module registered them (an extension’s too)', async () => {
    addProcessor(
      'customerAddressDataBeforeCreate',
      (address: Record<string, unknown>) => ({
        ...address,
        organization: 'Added by an extension'
      }),
      10
    );
    const harness = await pgLookupHarness(db!);
    const rules = await harness.lookup.addressRules();
    expect(
      await rules.normalize({ recipient: ' Jane ', country: 'us' })
    ).toMatchObject({
      recipient: 'Jane',
      country: 'US',
      organization: 'Added by an extension'
    });
  });

  it('says the name format the merchant set, as core reads it (the runtime settings)', async () => {
    const harness = await pgLookupHarness(db!);
    const rules = await harness.lookup.addressRules();
    expect(rules.nameFormat()).toBe('single');
    configureAddressRuntime({
      getSettings: () => ({ ...ADDRESS_SETTINGS_DEFAULTS, nameFormat: 'split' })
    });
    try {
      expect((await harness.lookup.addressRules()).nameFormat()).toBe('split');
    } finally {
      resetAddressRuntime();
    }
  });

  it('gives the extra fields that are registered for a country, and only for it', async () => {
    registerAddressField({
      id: 'gift_note',
      type: 'text',
      label: 'Gift note',
      countries: ['US']
    });
    const harness = await pgLookupHarness(db!);
    const rules = await harness.lookup.addressRules();
    expect(rules.extraIds('US')).toContain('gift_note');
    expect(rules.extraIds('us')).toContain('gift_note');
    expect(rules.extraIds('DE')).not.toContain('gift_note');
  });

  it('reserves the routes of one segment of letters, digits and hyphens, and the languages', async () => {
    const { PgLookup } = await import('../../../adapters/PgLookup.js');
    const lookup = new PgLookup(db!.pool, {
      routePaths: () => [
        '/cart',
        '/a/b',
        '/x_y',
        '/Sale-2',
        '/',
        '/ça',
        '/cart/'
      ],
      enabledLanguages: async () => ['en', 'vi']
    });
    expect([...(await lookup.reservedUrlKeys())].sort()).toEqual([
      'Sale-2',
      'cart',
      'en',
      'vi'
    ]);
  });
});

describeDb('PgEventBacklog', () => {
  eventBacklogContract('PgEventBacklog', () => pgEventHarness(db!));

  it('reads the copy of the event table in the test schema, which has no trigger: no event process is woken', async () => {
    const found = await db!.pool.query(
      `SELECT (SELECT n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.oid = to_regclass('event')) AS schema,
              (SELECT count(*)::int FROM pg_trigger
                WHERE tgrelid = to_regclass('event') AND NOT tgisinternal) AS triggers`
    );
    expect(found.rows[0]).toEqual({ schema: db!.schema, triggers: 0 });
  });

  describe("against the rules of core's own event queue (EventStorage)", () => {
    const MINUTE = 60_000;

    it('counts as waiting exactly the processing events that core does not mark as lost', async () => {
      const h = await pgEventHarness(db!);
      await h.add('processing', 1 * MINUTE);
      await h.add('processing', 4 * MINUTE);
      await h.add('processing', 6 * MINUTE);
      await h.add('processing', 30 * MINUTE);
      expect(await h.backlog.depth()).toBe(2);

      // Core marks the events that have been processing for too long as failed.
      const lost = await new EventStorage(db!.pool).markStuckAsFailed();
      expect(lost).toBe(2);
      const left = await db!.pool.query(
        `SELECT count(*)::int AS n FROM event WHERE status = 'processing'`
      );
      expect(left.rows[0].n).toBe(2);
      expect(await h.backlog.depth()).toBe(2);
    });

    it('does not change when the event process claims the events, and drops as it finishes them', async () => {
      const h = await pgEventHarness(db!);
      await h.add('pending');
      await h.add('pending');
      await h.add('pending');
      await h.add('processing', 1 * MINUTE);
      expect(await h.backlog.depth()).toBe(4);

      const storage = new EventStorage(db!.pool);
      const claimed = await storage.claimBatch(10);
      expect(claimed).toHaveLength(3);
      // They moved from pending to processing: still waiting.
      expect(await h.backlog.depth()).toBe(4);

      await storage.markDoneAndDelete(claimed[0].uuid);
      expect(await h.backlog.depth()).toBe(3);
    });
  });
});

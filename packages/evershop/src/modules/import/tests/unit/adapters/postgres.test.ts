import { afterAll, describe, expect, it, jest } from '@jest/globals';
import { PgFileStore } from '../../../adapters/PgFileStore.js';
import { PgJobRepository } from '../../../adapters/PgJobRepository.js';
import { FileDamagedError } from '../../../services/job/errors.js';
import { emptyCounts } from '../../../services/job/types.js';
import type { StoredIssue } from '../../../services/job/types.js';
import { fileStoreContract } from '../helpers/fileStoreContract.js';
import { jobRepositoryContract } from '../helpers/jobRepositoryContract.js';
import { lookupContract } from '../helpers/lookupContract.js';
import {
  pgFileHarness,
  pgJobHarness,
  pgLookupHarness
} from '../helpers/pgHarnesses.js';
import { openScratchDb } from '../helpers/scratchDb.js';

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
    const found = await pool().query(
      `SELECT (SELECT n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.oid = to_regclass('import_job')) AS schema,
              to_regclass('public.import_job')::text AS in_public`
    );
    expect(found.rows[0].schema).toBe(db!.schema);
    expect(found.rows[0].in_public).toBeNull();
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
  lookupContract('PgLookup', () => pgLookupHarness(db!));

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

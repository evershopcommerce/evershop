import { describe, it, expect, beforeEach } from '@jest/globals';
import type {
  ImportJob,
  IssuePhase,
  JobStatus,
  StoredIssue
} from '../../../services/job/types.js';
import { emptyCounts } from '../../../services/job/types.js';
import type { JobAdmin } from '../../../services/ports/jobAdmin.js';
import type { ImportEntity } from '../../../services/types.js';
import type { JobRepoHarness } from './jobRepositoryContract.js';

/** The jobs as the API sees them, and the ways to set one up and look at its file. */
export interface JobAdminHarness extends JobRepoHarness {
  admin: JobAdmin;
  /** The chunks stored for a job, in the order of `seq`. */
  chunksOf(jobId: number): Promise<Buffer[]>;
  /** Puts chunks on a job, as an upload that finished long ago did. */
  seedChunks(jobId: number, chunks: Buffer[]): Promise<void>;
}

const GONE = 987_654_321;

const issue = (
  rowNumber: number | null,
  more: Partial<StoredIssue> = {}
): StoredIssue => ({
  phase: 'validate',
  rowNumber,
  entityKey: 'k',
  column: 'status',
  code: 'INVALID_VALUE',
  severity: 'error',
  params: {},
  message: 'm',
  value: null,
  ...more
});

const bytes = (...values: number[]) => Buffer.from(values);

/**
 * What every `JobAdmin` must do (§ 4.5, point 6; § 8.3, 8.4): the upload and its
 * swap, and the actions of the admin as compare-and-swaps that say why they
 * refuse. It runs against the double and against PostgreSQL.
 *
 * The real table has two unique indexes (one open job per entity, one import
 * queued or running), so a test with several jobs gives them different entities
 * and at most one that is queued or running.
 */
export function jobAdminContract(
  label: string,
  make: () => Promise<JobAdminHarness>
): void {
  describe(`${label}: the contract of a JobAdmin`, () => {
    let h: JobAdminHarness;
    let admin: JobAdmin;

    beforeEach(async () => {
      h = await make();
      admin = h.admin;
    });

    /** A job that is uploading, as `beginUpload` makes it. */
    const uploading = (entity: ImportEntity = 'category') =>
      admin.beginUpload({
        entity,
        mode: 'upsert',
        options: {},
        fileName: 'f.csv',
        createdBy: null
      });

    describe('getByUuid', () => {
      it('gives the job that has the uuid, and null for any other', async () => {
        const job = await h.insert({ status: 'validated' });
        await h.insert({ entity: 'product', status: 'validated' });
        expect((await admin.getByUuid(job.uuid))?.id).toBe(job.id);
        expect(
          await admin.getByUuid('11111111-2222-4333-8444-555555555555')
        ).toBeNull();
      });
    });

    describe('beginUpload and addChunk', () => {
      it('inserts a job that is uploading, with what the page sent', async () => {
        const before = h.now();
        const job = await admin.beginUpload({
          entity: 'product',
          mode: 'create',
          options: { checkImages: true },
          fileName: 'products.csv',
          createdBy: null
        });
        expect(job).toMatchObject({
          entity: 'product',
          mode: 'create',
          status: 'uploading',
          options: { checkImages: true },
          fileName: 'products.csv',
          fileSize: 0,
          chunkCount: null,
          fileSha256: null,
          attempt: 0,
          counts: emptyCounts()
        });
        expect(job.createdAt).toBeGreaterThanOrEqual(before);
        expect(await admin.get(job.id)).toEqual(job);
      });

      it('blocks nothing: the job it will replace stays open beside it', async () => {
        const open = await h.insert({ status: 'validated' });
        const job = await uploading();
        expect((await admin.get(open.id))?.status).toBe('validated');
        expect(job.id).not.toBe(open.id);
        expect((await admin.listOpen()).map((j) => j.id)).toEqual([open.id]);
      });

      it('stores the chunks it is given, byte for byte, and keeps the job alive', async () => {
        const job = await uploading();
        await h.advance(20);
        const before = h.now();
        const all = Buffer.from(Array.from({ length: 256 }, (_, n) => n));
        expect(await admin.addChunk(job.id, 0, all)).toBe(true);
        expect(await admin.addChunk(job.id, 1, bytes(1, 2, 3))).toBe(true);
        const stored = await h.chunksOf(job.id);
        expect(stored).toHaveLength(2);
        expect(stored[0].equals(all)).toBe(true);
        expect(stored[1].equals(bytes(1, 2, 3))).toBe(true);
        expect((await h.snapshot(job.id)).heartbeatAt).toBeGreaterThanOrEqual(
          before
        );
      });

      it('refuses a chunk for a job that is not uploading, or not there', async () => {
        const job = await h.insert({ status: 'uploaded' });
        expect(await admin.addChunk(job.id, 0, bytes(1))).toBe(false);
        expect(await admin.addChunk(GONE, 0, bytes(1))).toBe(false);
        expect(await h.chunksOf(job.id)).toEqual([]);
      });

      it('refuses a chunk number used twice', async () => {
        const job = await uploading();
        await admin.addChunk(job.id, 0, bytes(1));
        await expect(admin.addChunk(job.id, 0, bytes(2))).rejects.toThrow(
          'IMPORT_JOB_FILE_SEQ_UNIQUE'
        );
      });
    });

    describe('entityBusy', () => {
      it.each<[JobStatus, number | null, boolean]>([
        ['running', null, true],
        ['queued', 5, true],
        ['queued', null, false],
        ['uploaded', null, false],
        ['validating', null, false],
        ['validated', null, false],
        ['stopped', 5, false],
        ['interrupted', 5, false],
        ['completed', 5, false]
      ])(
        'a job that is %s (started at %s) makes the entity busy: %s',
        async (status, startedAt, busy) => {
          await h.insert({ status, startedAt });
          expect(await admin.entityBusy('category')).toBe(busy);
          expect(await admin.entityBusy('product')).toBe(false);
        }
      );
    });

    describe('completeUpload (the swap)', () => {
      const file = { size: 7, chunkCount: 2, sha256: 'a'.repeat(64) };

      it('records the file and makes the job uploaded', async () => {
        const job = await uploading();
        await admin.addChunk(job.id, 0, bytes(1, 2, 3, 4));
        await admin.addChunk(job.id, 1, bytes(5, 6, 7));
        const before = h.now();
        const done = await admin.completeUpload(job.id, file);
        expect(done).toMatchObject({ ok: true, replaced: false });
        expect((done as { job: ImportJob }).job).toMatchObject({
          id: job.id,
          status: 'uploaded',
          fileSize: 7,
          chunkCount: 2,
          fileSha256: 'a'.repeat(64)
        });
        const stored = await h.snapshot(job.id);
        expect(stored.status).toBe('uploaded');
        expect(stored.expiresAt).toBeGreaterThanOrEqual(before + h.retentionMs);
        expect(await h.chunksOf(job.id)).toHaveLength(2);
      });

      it('says that the job is gone when it is not uploading any more', async () => {
        expect(await admin.completeUpload(GONE, file)).toEqual({
          ok: false,
          reason: 'gone'
        });
        const job = await h.insert({ status: 'uploaded' });
        expect(await admin.completeUpload(job.id, file)).toEqual({
          ok: false,
          reason: 'gone'
        });
      });

      it.each(['uploaded', 'validating', 'validated', 'queued'] as const)(
        'deletes an unstarted job of the entity that is %s, with its file and its problems',
        async (status) => {
          const old = await h.insert({ status });
          await h.seedChunks(old.id, [bytes(1), bytes(2)]);
          await h.seedIssues(old.id, [issue(2), issue(3)]);
          const job = await uploading();
          await admin.addChunk(job.id, 0, bytes(9));
          const done = await admin.completeUpload(job.id, {
            ...file,
            chunkCount: 1
          });
          expect(done).toMatchObject({ ok: true, replaced: true });
          expect(await admin.get(old.id)).toBeNull();
          expect(await h.chunksOf(old.id)).toEqual([]);
          expect(await h.issues(old.id)).toEqual([]);
          // The new file is the only list.
          expect(await h.chunksOf(job.id)).toHaveLength(1);
          expect((await admin.listOpen()).map((j) => j.id)).toEqual([job.id]);
        }
      );

      it('leaves the jobs of other entities alone', async () => {
        const other = await h.insert({
          entity: 'product',
          status: 'validated'
        });
        await h.seedChunks(other.id, [bytes(1)]);
        const job = await uploading('category');
        const done = await admin.completeUpload(job.id, file);
        expect(done).toMatchObject({ ok: true, replaced: false });
        expect((await admin.get(other.id))?.status).toBe('validated');
        expect(await h.chunksOf(other.id)).toHaveLength(1);
      });

      it('leaves a file that is still arriving alone', async () => {
        const arriving = await uploading();
        await admin.addChunk(arriving.id, 0, bytes(1));
        const job = await uploading();
        const done = await admin.completeUpload(job.id, file);
        expect(done).toMatchObject({ ok: true, replaced: false });
        expect((await admin.get(arriving.id))?.status).toBe('uploading');
        expect(await h.chunksOf(arriving.id)).toHaveLength(1);
      });

      it('lets the later of two uploads win', async () => {
        const first = await uploading();
        const second = await uploading();
        expect(await admin.completeUpload(first.id, file)).toMatchObject({
          ok: true
        });
        expect(await admin.completeUpload(second.id, file)).toMatchObject({
          ok: true,
          replaced: true
        });
        expect(await admin.get(first.id)).toBeNull();
        expect((await admin.get(second.id))?.status).toBe('uploaded');
      });

      it('lets two uploads that finish at the same moment end in one job', async () => {
        const first = await uploading();
        const second = await uploading();
        const [a, b] = await Promise.all([
          admin.completeUpload(first.id, file),
          admin.completeUpload(second.id, file)
        ]);
        expect(a.ok && b.ok).toBe(true);
        const open = await admin.listOpen();
        expect(open).toHaveLength(1);
        expect(open[0].status).toBe('uploaded');
        expect([first.id, second.id]).toContain(open[0].id);
      });

      it.each<[JobStatus, number | null]>([
        ['running', null],
        ['queued', 5]
      ])(
        'is refused while the import is busy (%s), and changes nothing',
        async (status, startedAt) => {
          const busy = await h.insert({ status, startedAt });
          await h.seedChunks(busy.id, [bytes(1)]);
          const job = await uploading();
          await admin.addChunk(job.id, 0, bytes(2));
          expect(await admin.completeUpload(job.id, file)).toEqual({
            ok: false,
            reason: 'import_running'
          });
          expect((await admin.get(busy.id))?.status).toBe(status);
          expect(await h.chunksOf(busy.id)).toHaveLength(1);
          // The new job is still uploading: the service deletes it.
          expect((await admin.get(job.id))?.status).toBe('uploading');
          await admin.abortUpload(job.id);
          expect(await admin.get(job.id)).toBeNull();
        }
      );

      it.each(['stopped', 'interrupted'] as const)(
        'deletes a %s job that never wrote anything',
        async (status) => {
          const old = await h.insert({ status, startedAt: null });
          const job = await uploading();
          expect(await admin.completeUpload(job.id, file)).toMatchObject({
            ok: true,
            replaced: true
          });
          expect(await admin.get(old.id)).toBeNull();
        }
      );

      it.each(['stopped', 'interrupted'] as const)(
        'closes a %s job that wrote something as canceled, and deletes its file',
        async (status) => {
          const old = await h.insert({
            status,
            startedAt: h.now() - 1000,
            counts: { ...emptyCounts(), created: 12, failed: 3 },
            chunkCount: 2
          });
          await h.seedChunks(old.id, [bytes(1), bytes(2)]);
          await h.seedIssues(old.id, [issue(2, { phase: 'import' })]);
          const before = h.now();
          const job = await uploading();
          expect(await admin.completeUpload(job.id, file)).toMatchObject({
            ok: true,
            replaced: true
          });
          const closed = await h.snapshot(old.id);
          expect(closed).toMatchObject({
            status: 'canceled',
            stage: null,
            control: null,
            counts: { created: 12, failed: 3 }
          });
          expect(closed.finishedAt).toBeGreaterThanOrEqual(before);
          expect(closed.expiresAt).toBeGreaterThanOrEqual(
            before + h.retentionMs
          );
          expect(await h.chunksOf(old.id)).toEqual([]);
          expect(closed.chunkCount).toBeNull();
          // What it reported stays as history.
          expect(await h.issues(old.id)).toHaveLength(1);
        }
      );

      it.each(['completed', 'failed', 'canceled'] as const)(
        'deletes the file a %s job kept, and keeps the job as history',
        async (status) => {
          const old = await h.insert({ status, startedAt: 5, chunkCount: 1 });
          await h.seedChunks(old.id, [bytes(1)]);
          await h.seedIssues(old.id, [issue(2)]);
          const job = await uploading();
          expect(await admin.completeUpload(job.id, file)).toMatchObject({
            ok: true,
            replaced: false
          });
          expect((await admin.get(old.id))?.status).toBe(status);
          expect(await h.chunksOf(old.id)).toEqual([]);
          // The job says it has no file, so its page does not offer the download.
          expect((await admin.get(old.id))?.chunkCount).toBeNull();
          expect(await h.issues(old.id)).toHaveLength(1);
        }
      );
    });

    describe('abortUpload', () => {
      it('deletes a job that is uploading, with its chunks', async () => {
        const job = await uploading();
        await admin.addChunk(job.id, 0, bytes(1));
        await admin.abortUpload(job.id);
        expect(await admin.get(job.id)).toBeNull();
        expect(await h.chunksOf(job.id)).toEqual([]);
      });

      it('leaves a job that is anything else', async () => {
        const job = await h.insert({ status: 'validated' });
        await admin.abortUpload(job.id);
        expect((await admin.get(job.id))?.status).toBe('validated');
        await expect(admin.abortUpload(GONE)).resolves.toBeUndefined();
      });
    });

    describe('start', () => {
      it('moves a clean validated job to queued', async () => {
        const job = await h.insert({
          status: 'validated',
          errorMessage: 'The file was checked again.',
          expiresAt: h.now() + 1000
        });
        const result = await admin.start(job.id);
        expect(result).toMatchObject({ ok: true });
        expect((result as { job: ImportJob }).job.status).toBe('queued');
        expect(await h.snapshot(job.id)).toMatchObject({
          status: 'queued',
          errorMessage: null,
          expiresAt: null,
          attempt: 0
        });
      });

      it('says that there is no such job', async () => {
        expect(await admin.start(GONE)).toEqual({
          ok: false,
          reason: 'not_found'
        });
      });

      it.each([
        'uploading',
        'uploaded',
        'validating',
        'queued',
        'running',
        'completed',
        'failed',
        'stopped',
        'canceled',
        'interrupted'
      ] as const)('refuses a job that is %s, and says so', async (status) => {
        const job = await h.insert({ status });
        expect(await admin.start(job.id)).toEqual({
          ok: false,
          reason: 'wrong_status',
          status
        });
        expect((await h.snapshot(job.id)).status).toBe(status);
      });

      it('refuses a file that has errors (D-17)', async () => {
        const job = await h.insert({
          status: 'validated',
          counts: { ...emptyCounts(), errors: 3 }
        });
        expect(await admin.start(job.id)).toEqual({
          ok: false,
          reason: 'file_has_errors'
        });
        expect((await h.snapshot(job.id)).status).toBe('validated');
      });

      it('lets a file with warnings go', async () => {
        const job = await h.insert({
          status: 'validated',
          counts: { ...emptyCounts(), warnings: 9 }
        });
        expect(await admin.start(job.id)).toMatchObject({ ok: true });
      });

      it.each(['queued', 'running'] as const)(
        'refuses a second import while another is %s, and says which',
        async (status) => {
          await h.insert({ entity: 'category', status });
          const job = await h.insert({
            entity: 'product',
            status: 'validated'
          });
          expect(await admin.start(job.id)).toEqual({
            ok: false,
            reason: 'import_running',
            entity: 'category'
          });
          expect((await h.snapshot(job.id)).status).toBe('validated');
        }
      );

      it('lets one of two Starts that come at the same moment win', async () => {
        const a = await h.insert({ entity: 'category', status: 'validated' });
        const b = await h.insert({ entity: 'product', status: 'validated' });
        const results = await Promise.all([
          admin.start(a.id),
          admin.start(b.id)
        ]);
        expect(results.filter((r) => r.ok)).toHaveLength(1);
        const refused = results.find((r) => !r.ok);
        expect(refused).toMatchObject({
          ok: false,
          reason: 'import_running'
        });
        const statuses = [
          (await h.snapshot(a.id)).status,
          (await h.snapshot(b.id)).status
        ].sort();
        expect(statuses).toEqual(['queued', 'validated']);
      });

      it('lets a Start and a Check again of the same job end in one state', async () => {
        const job = await h.insert({ status: 'validated' });
        const [start, recheck] = await Promise.all([
          admin.start(job.id),
          admin.recheck(job.id)
        ]);
        expect([start.ok, recheck.ok].filter(Boolean)).toHaveLength(1);
        expect(['queued', 'uploaded']).toContain(
          (await h.snapshot(job.id)).status
        );
      });
    });

    describe('cancel', () => {
      it('cancels a queued job nobody has claimed, at once', async () => {
        const job = await h.insert({ status: 'queued', control: null });
        const before = h.now();
        const result = await admin.cancel(job.id);
        expect(result).toMatchObject({ ok: true, how: 'canceled' });
        const stored = await h.snapshot(job.id);
        expect(stored.status).toBe('canceled');
        expect(stored.finishedAt).toBeGreaterThanOrEqual(before);
        expect(stored.expiresAt).toBeGreaterThanOrEqual(before + h.retentionMs);
      });

      it.each(['validating', 'running'] as const)(
        'asks the worker of a %s job to stop, and leaves the status to it',
        async (status) => {
          const job = await h.insert({ status, attempt: 1 });
          const result = await admin.cancel(job.id);
          expect(result).toMatchObject({ ok: true, how: 'requested' });
          expect(await h.snapshot(job.id)).toMatchObject({
            status,
            control: 'cancel'
          });
        }
      );

      it.each([
        'uploading',
        'uploaded',
        'validated',
        'completed',
        'failed',
        'stopped',
        'canceled',
        'interrupted'
      ] as const)('refuses a job that is %s', async (status) => {
        const job = await h.insert({ status });
        expect(await admin.cancel(job.id)).toEqual({
          ok: false,
          reason: 'wrong_status',
          status
        });
        expect((await h.snapshot(job.id)).control).toBeNull();
      });

      it('says that there is no such job', async () => {
        expect(await admin.cancel(GONE)).toEqual({
          ok: false,
          reason: 'not_found'
        });
      });
    });

    describe('resume', () => {
      it.each(['stopped', 'interrupted'] as const)(
        'queues a %s job that wrote something',
        async (status) => {
          const job = await h.insert({
            status,
            startedAt: 5,
            control: 'cancel',
            expiresAt: h.now() + 1000
          });
          const result = await admin.resume(job.id);
          expect(result).toMatchObject({ ok: true });
          expect(await h.snapshot(job.id)).toMatchObject({
            status: 'queued',
            control: null,
            expiresAt: null,
            startedAt: 5
          });
        }
      );

      it.each(['stopped', 'interrupted'] as const)(
        'sends a %s job that never wrote back to uploaded',
        async (status) => {
          const job = await h.insert({ status, startedAt: null });
          const before = h.now();
          await admin.resume(job.id);
          const stored = await h.snapshot(job.id);
          expect(stored.status).toBe('uploaded');
          expect(stored.expiresAt).toBeGreaterThanOrEqual(
            before + h.retentionMs
          );
        }
      );

      it.each([
        'uploading',
        'uploaded',
        'validating',
        'validated',
        'queued',
        'running',
        'completed',
        'failed',
        'canceled'
      ] as const)('refuses a job that is %s', async (status) => {
        const job = await h.insert({ status });
        expect(await admin.resume(job.id)).toEqual({
          ok: false,
          reason: 'wrong_status',
          status
        });
      });

      it('says that there is no such job', async () => {
        expect(await admin.resume(GONE)).toEqual({
          ok: false,
          reason: 'not_found'
        });
      });

      it('refuses when the entity has another open job', async () => {
        const stopped = await h.insert({ status: 'stopped', startedAt: 5 });
        await h.insert({ status: 'validated' });
        expect(await admin.resume(stopped.id)).toEqual({
          ok: false,
          reason: 'open_job_exists'
        });
        expect((await h.snapshot(stopped.id)).status).toBe('stopped');
      });

      it('refuses to queue a job while another import runs, and says which', async () => {
        await h.insert({ entity: 'product', status: 'running' });
        const stopped = await h.insert({
          entity: 'category',
          status: 'interrupted',
          startedAt: 5
        });
        expect(await admin.resume(stopped.id)).toEqual({
          ok: false,
          reason: 'import_running',
          entity: 'product'
        });
        expect((await h.snapshot(stopped.id)).status).toBe('interrupted');
      });

      it('lets a job that never wrote go back to uploaded while another import runs', async () => {
        await h.insert({ entity: 'product', status: 'running' });
        const stopped = await h.insert({
          entity: 'category',
          status: 'interrupted',
          startedAt: null
        });
        expect(await admin.resume(stopped.id)).toMatchObject({ ok: true });
      });
    });

    describe('recheck (Check again, D-33)', () => {
      it('moves a validated job back to uploaded', async () => {
        const job = await h.insert({ status: 'validated' });
        const before = h.now();
        const result = await admin.recheck(job.id);
        expect(result).toMatchObject({ ok: true });
        const stored = await h.snapshot(job.id);
        expect(stored.status).toBe('uploaded');
        expect(stored.expiresAt).toBeGreaterThanOrEqual(before + h.retentionMs);
      });

      it.each([
        'uploaded',
        'validating',
        'queued',
        'running',
        'completed',
        'stopped'
      ] as const)('refuses a job that is %s', async (status) => {
        const job = await h.insert({ status });
        expect(await admin.recheck(job.id)).toEqual({
          ok: false,
          reason: 'wrong_status',
          status
        });
      });

      it('says that there is no such job', async () => {
        expect(await admin.recheck(GONE)).toEqual({
          ok: false,
          reason: 'not_found'
        });
      });
    });

    describe('remove', () => {
      it.each([
        'uploaded',
        'validated',
        'completed',
        'failed',
        'stopped',
        'canceled',
        'interrupted'
      ] as const)(
        'deletes a job that is %s, with its file and its problems',
        async (status) => {
          const job = await h.insert({ status });
          await h.seedChunks(job.id, [bytes(1), bytes(2)]);
          await h.seedIssues(job.id, [issue(2)]);
          const result = await admin.remove(job.id);
          expect(result).toMatchObject({ ok: true });
          expect((result as { job: ImportJob }).job.id).toBe(job.id);
          expect(await admin.get(job.id)).toBeNull();
          expect(await h.chunksOf(job.id)).toEqual([]);
          expect(await h.issues(job.id)).toEqual([]);
        }
      );

      it.each(['uploading', 'validating', 'queued', 'running'] as const)(
        'refuses a job that is %s',
        async (status) => {
          const job = await h.insert({ status });
          expect(await admin.remove(job.id)).toEqual({
            ok: false,
            reason: 'wrong_status',
            status
          });
          expect(await admin.get(job.id)).not.toBeNull();
        }
      );

      it('says that there is no such job', async () => {
        expect(await admin.remove(GONE)).toEqual({
          ok: false,
          reason: 'not_found'
        });
      });

      it('leaves the other jobs alone', async () => {
        const a = await h.insert({ entity: 'category', status: 'completed' });
        const b = await h.insert({ entity: 'product', status: 'completed' });
        await h.seedChunks(b.id, [bytes(1)]);
        await h.seedIssues(b.id, [issue(2)]);
        await admin.remove(a.id);
        expect(await admin.get(b.id)).not.toBeNull();
        expect(await h.chunksOf(b.id)).toHaveLength(1);
        expect(await h.issues(b.id)).toHaveLength(1);
      });
    });

    describe('listOpen', () => {
      it('gives the open jobs and the resumable ones, by entity, and nothing else', async () => {
        const statuses: Array<[ImportEntity, JobStatus]> = [
          ['product', 'validated'],
          ['category', 'running'],
          ['customer', 'interrupted']
        ];
        const ids = new Map<string, number>();
        for (const [entity, status] of statuses) {
          // eslint-disable-next-line no-await-in-loop
          ids.set(entity, (await h.insert({ entity, status })).id);
        }
        await h.insert({ entity: 'customerAddress', status: 'completed' });
        await h.insert({ entity: 'customerAddress', status: 'uploading' });
        const listed = await admin.listOpen();
        expect(listed.map((job) => job.entity)).toEqual([
          'category',
          'customer',
          'product'
        ]);
        expect(listed.map((job) => job.id)).toEqual([
          ids.get('category'),
          ids.get('customer'),
          ids.get('product')
        ]);
      });

      it('gives nothing when there is nothing open', async () => {
        expect(await admin.listOpen()).toEqual([]);
      });
    });

    describe('issuePage', () => {
      const seed = async () => {
        const job = await h.insert({ status: 'validated' });
        const other = await h.insert({
          entity: 'product',
          status: 'validated'
        });
        await h.seedIssues(job.id, [
          issue(5, {
            code: 'INVALID_VALUE',
            column: 'status',
            message: 'five'
          }),
          issue(null, { code: 'FILE_EMPTY', column: null, message: 'file' }),
          issue(3, {
            code: 'MISSING_REQUIRED',
            column: 'name',
            message: 'three-a'
          }),
          issue(3, {
            code: 'INVALID_VALUE',
            column: 'position',
            severity: 'warning',
            message: 'three-b'
          }),
          issue(9, { phase: 'import', code: 'WRITE_FAILED', message: 'nine' })
        ]);
        await h.seedIssues(other.id, [issue(1, { message: 'another job' })]);
        return job;
      };
      const messages = (page: { items: StoredIssue[] }) =>
        page.items.map((i) => i.message);
      const all = (phase: IssuePhase) => ({ phase, offset: 0, limit: 100 });

      it('lists the problems of a phase, with no row first, then by row and in the order found', async () => {
        const job = await seed();
        const page = await admin.issuePage(job.id, all('validate'));
        expect(messages(page)).toEqual(['file', 'three-a', 'three-b', 'five']);
        expect(page.total).toBe(4);
        expect(messages(await admin.issuePage(job.id, all('import')))).toEqual([
          'nine'
        ]);
      });

      it('gives the problems as they were stored', async () => {
        const job = await h.insert({ status: 'validated' });
        const given = issue(7, {
          entityKey: 'women',
          column: 'parent',
          code: 'REFERENCE_NOT_FOUND',
          severity: 'warning',
          params: { parent: 'ghost', n: [1, 2] },
          message: 'It is not there.',
          value: 'ghost'
        });
        await h.seedIssues(job.id, [given]);
        expect((await admin.issuePage(job.id, all('validate'))).items).toEqual([
          given
        ]);
      });

      it('filters by severity, code and column, together', async () => {
        const job = await seed();
        const query = all('validate');
        expect(
          messages(
            await admin.issuePage(job.id, { ...query, severity: 'warning' })
          )
        ).toEqual(['three-b']);
        expect(
          messages(
            await admin.issuePage(job.id, { ...query, code: 'INVALID_VALUE' })
          )
        ).toEqual(['three-b', 'five']);
        expect(
          messages(await admin.issuePage(job.id, { ...query, column: 'name' }))
        ).toEqual(['three-a']);
        const none = await admin.issuePage(job.id, {
          ...query,
          code: 'INVALID_VALUE',
          severity: 'warning',
          column: 'status'
        });
        expect(none).toEqual({ items: [], total: 0 });
      });

      it('gives one page, and the total of all the pages', async () => {
        const job = await seed();
        const first = await admin.issuePage(job.id, {
          phase: 'validate',
          offset: 0,
          limit: 3
        });
        const second = await admin.issuePage(job.id, {
          phase: 'validate',
          offset: 3,
          limit: 3
        });
        expect(messages(first)).toEqual(['file', 'three-a', 'three-b']);
        expect(messages(second)).toEqual(['five']);
        expect([first.total, second.total]).toEqual([4, 4]);
        const past = await admin.issuePage(job.id, {
          phase: 'validate',
          offset: 30,
          limit: 3
        });
        expect(past).toEqual({ items: [], total: 4 });
      });

      it('gives nothing for a job that is not there', async () => {
        expect(await admin.issuePage(GONE, all('validate'))).toEqual({
          items: [],
          total: 0
        });
      });
    });
  });
}

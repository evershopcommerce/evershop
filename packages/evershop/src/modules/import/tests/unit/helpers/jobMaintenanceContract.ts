import { describe, it, expect, beforeEach } from '@jest/globals';
import { emptyCounts } from '../../../services/job/types.js';
import type { JobStatus } from '../../../services/job/types.js';
import type { JobMaintenance } from '../../../services/ports/jobMaintenance.js';
import type { JobAdminHarness } from './jobAdminContract.js';

/** The jobs and what the cron jobs do to them. */
export interface JobMaintenanceHarness extends JobAdminHarness {
  maintenance: JobMaintenance;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const DEAD_AFTER = 2 * MINUTE;
const QUIET = 30 * SECOND;
const UPLOAD_IDLE = 10 * MINUTE;

const bytes = (...values: number[]) => Buffer.from(values);

const issue = {
  phase: 'import' as const,
  rowNumber: 2,
  entityKey: 'k',
  column: null,
  code: 'INVALID_VALUE',
  severity: 'error' as const,
  params: {},
  message: 'm',
  value: null
};

const counts = (failed: number, skipped: number) => ({
  ...emptyCounts(),
  failed,
  skipped
});

/**
 * What every `JobMaintenance` must do (§ 8.4: Heartbeat and recovery, Cleanup,
 * and the dispatch cron). It runs against the double and against PostgreSQL, so
 * every time here is written relative to the clock of the store with margins of
 * minutes, and nothing waits.
 *
 * The real table has two unique indexes (one open job per entity, one import
 * queued or running), so a test with several jobs gives them different entities
 * and at most one that is queued or running.
 */
export function jobMaintenanceContract(
  label: string,
  make: () => Promise<JobMaintenanceHarness>
): void {
  describe(`${label}: the contract of a JobMaintenance`, () => {
    let h: JobMaintenanceHarness;
    let m: JobMaintenance;
    const ago = (ms: number) => h.now() - ms;

    beforeEach(async () => {
      h = await make();
      m = h.maintenance;
    });

    describe('recoverDead: a worker that stopped reporting', () => {
      it('interrupts a validating and a running job, with the message, and keeps what the worker had written', async () => {
        const a = await h.insert({
          entity: 'category',
          status: 'validating',
          heartbeatAt: ago(3 * MINUTE),
          statusChangedAt: ago(10 * MINUTE),
          worker: 'host:1',
          attempt: 1,
          stage: 'reading',
          control: 'cancel',
          waitingSince: ago(2 * MINUTE)
        });
        const b = await h.insert({
          entity: 'product',
          status: 'running',
          heartbeatAt: ago(3 * MINUTE),
          startedAt: ago(10 * MINUTE),
          worker: 'host:2',
          attempt: 2,
          stage: 'writing',
          counts: { ...emptyCounts(), created: 7, lastUnit: 7 }
        });
        const recovered = await m.recoverDead(DEAD_AFTER, 'it died');
        expect(recovered).toEqual([
          { uuid: a.uuid, entity: 'category', was: 'validating' },
          { uuid: b.uuid, entity: 'product', was: 'running' }
        ]);
        const first = await h.snapshot(a.id);
        expect(first).toMatchObject({
          status: 'interrupted',
          errorMessage: 'it died',
          stage: null,
          control: null,
          waitingSince: null,
          worker: 'host:1',
          attempt: 1,
          finishedAt: null
        });
        // It is kept for the retention from now, and the change is dated now.
        expect(
          Math.abs(first.expiresAt! - (h.now() + h.retentionMs))
        ).toBeLessThan(MINUTE);
        expect(Math.abs(first.statusChangedAt - h.now())).toBeLessThan(MINUTE);
        const second = await h.snapshot(b.id);
        expect(second).toMatchObject({
          status: 'interrupted',
          startedAt: b.startedAt,
          worker: 'host:2',
          attempt: 2,
          counts: { created: 7, lastUnit: 7 }
        });
      });

      it('leaves a worker that reported lately alone', async () => {
        const job = await h.insert({
          status: 'running',
          heartbeatAt: ago(10 * SECOND),
          startedAt: ago(MINUTE)
        });
        expect(await m.recoverDead(DEAD_AFTER, 'it died')).toEqual([]);
        expect((await h.snapshot(job.id)).status).toBe('running');
      });

      it('goes by the last status change for a job that never reported', async () => {
        const old = await h.insert({
          entity: 'category',
          status: 'validating',
          heartbeatAt: null,
          statusChangedAt: ago(3 * MINUTE)
        });
        const fresh = await h.insert({
          entity: 'product',
          status: 'validating',
          heartbeatAt: null,
          statusChangedAt: ago(10 * SECOND)
        });
        const recovered = await m.recoverDead(DEAD_AFTER, 'it died');
        expect(recovered.map((job) => job.uuid)).toEqual([old.uuid]);
        expect((await h.snapshot(fresh.id)).status).toBe('validating');
      });

      it.each([
        'uploading',
        'uploaded',
        'validated',
        'queued',
        'completed',
        'failed',
        'stopped',
        'canceled',
        'interrupted'
      ] as JobStatus[])(
        'leaves a job that is %s alone, whatever its heartbeat',
        async (status) => {
          const job = await h.insert({
            status,
            heartbeatAt: ago(3 * MINUTE),
            statusChangedAt: ago(3 * MINUTE)
          });
          expect(await m.recoverDead(DEAD_AFTER, 'it died')).toEqual([]);
          expect((await h.snapshot(job.id)).status).toBe(status);
        }
      );

      it('does nothing the second time', async () => {
        const job = await h.insert({
          status: 'running',
          heartbeatAt: ago(3 * MINUTE),
          startedAt: ago(10 * MINUTE)
        });
        expect(await m.recoverDead(DEAD_AFTER, 'it died')).toHaveLength(1);
        const after = await h.snapshot(job.id);
        expect(await m.recoverDead(DEAD_AFTER, 'it died')).toEqual([]);
        expect(await h.snapshot(job.id)).toEqual(after);
      });

      it('fences the dead worker out, and the job can be resumed', async () => {
        const job = await h.insert({
          status: 'validating',
          heartbeatAt: ago(3 * MINUTE),
          attempt: 1
        });
        await m.recoverDead(DEAD_AFTER, 'it died');
        // The worker wakes up: its next write finds the job not its own.
        expect(
          await h.repo.checkpoint(job.id, 1, {
            counts: emptyCounts(),
            issues: []
          })
        ).toEqual({ ok: false });
        // It never wrote anything, so Resume sends it back to be checked.
        const resumed = await h.admin.resume(job.id);
        expect(resumed).toMatchObject({
          ok: true,
          job: { status: 'uploaded' }
        });
      });

      it('frees the place of the one import at a time', async () => {
        await h.insert({
          entity: 'product',
          status: 'running',
          heartbeatAt: ago(3 * MINUTE),
          startedAt: ago(10 * MINUTE)
        });
        const waiting = await h.insert({
          entity: 'category',
          status: 'validated'
        });
        expect(await h.admin.start(waiting.id)).toMatchObject({
          ok: false,
          reason: 'import_running'
        });
        await m.recoverDead(DEAD_AFTER, 'it died');
        expect(await h.admin.start(waiting.id)).toMatchObject({ ok: true });
      });
    });

    describe('waitingForWorker: the dispatch cron', () => {
      it('lists the uploaded and queued jobs that waited more than the quiet time, the longest first', async () => {
        // Inserted in an order that is not the order of waiting.
        const d = await h.insert({
          entity: 'customerAddress',
          status: 'uploaded',
          statusChangedAt: ago(MINUTE)
        });
        await h.insert({
          entity: 'customer',
          status: 'uploaded',
          statusChangedAt: ago(10 * SECOND)
        });
        const a = await h.insert({
          entity: 'category',
          status: 'uploaded',
          statusChangedAt: ago(5 * MINUTE)
        });
        const b = await h.insert({
          entity: 'product',
          status: 'queued',
          statusChangedAt: ago(2 * MINUTE)
        });
        expect(await m.waitingForWorker(QUIET)).toEqual([
          a.uuid,
          b.uuid,
          d.uuid
        ]);
      });

      it('gives nothing when nobody waits', async () => {
        expect(await m.waitingForWorker(QUIET)).toEqual([]);
      });

      it.each([
        'uploading',
        'validating',
        'validated',
        'running',
        'completed',
        'failed',
        'stopped',
        'canceled',
        'interrupted'
      ] as JobStatus[])('does not list a job that is %s', async (status) => {
        await h.insert({ status, statusChangedAt: ago(5 * MINUTE) });
        expect(await m.waitingForWorker(QUIET)).toEqual([]);
      });
    });

    describe('cleanUp: what nobody will use again', () => {
      const none = { abandonedUploads: 0, expiredJobs: 0, filesDropped: 0 };

      it('does nothing when there is nothing to do', async () => {
        expect(await m.cleanUp(UPLOAD_IDLE)).toEqual(none);
      });

      it('deletes an upload with no chunk for too long, with its chunks, and no other', async () => {
        const idle = await h.insert({
          status: 'uploading',
          heartbeatAt: ago(11 * MINUTE)
        });
        await h.seedChunks(idle.id, [bytes(1), bytes(2)]);
        const active = await h.insert({
          status: 'uploading',
          heartbeatAt: ago(MINUTE)
        });
        await h.seedChunks(active.id, [bytes(3)]);
        // Before its first chunk it has no heartbeat: the time it was made counts.
        const neverStarted = await h.insert({
          status: 'uploading',
          heartbeatAt: null,
          createdAt: ago(11 * MINUTE)
        });
        const justBegun = await h.insert({
          status: 'uploading',
          heartbeatAt: null
        });
        expect(await m.cleanUp(UPLOAD_IDLE)).toEqual({
          ...none,
          abandonedUploads: 2
        });
        expect(await h.admin.get(idle.id)).toBeNull();
        expect(await h.chunksOf(idle.id)).toEqual([]);
        expect(await h.admin.get(neverStarted.id)).toBeNull();
        expect(await h.admin.get(active.id)).not.toBeNull();
        expect(await h.chunksOf(active.id)).toEqual([bytes(3)]);
        expect(await h.admin.get(justBegun.id)).not.toBeNull();
      });

      it.each([
        'uploaded',
        'validated',
        'completed',
        'failed',
        'stopped',
        'canceled',
        'interrupted',
        'validating',
        'queued',
        'running'
      ] as JobStatus[])(
        'does not take a job that is %s for an abandoned upload, whatever its heartbeat',
        async (status) => {
          const job = await h.insert({
            status,
            heartbeatAt: ago(3 * 60 * MINUTE),
            createdAt: ago(3 * 60 * MINUTE),
            expiresAt: h.now() + h.retentionMs,
            counts: counts(1, 0)
          });
          expect(await m.cleanUp(UPLOAD_IDLE)).toEqual(none);
          expect(await h.admin.get(job.id)).not.toBeNull();
        }
      );

      it.each([
        'uploaded',
        'validated',
        'completed',
        'failed',
        'stopped',
        'canceled',
        'interrupted'
      ] as JobStatus[])(
        'deletes a job that is %s past its expiry, with its file and problems',
        async (status) => {
          const job = await h.insert({
            status,
            expiresAt: ago(MINUTE),
            counts: counts(1, 0)
          });
          await h.seedChunks(job.id, [bytes(1), bytes(2)]);
          await h.seedIssues(job.id, [issue]);
          expect(await m.cleanUp(UPLOAD_IDLE)).toEqual({
            ...none,
            expiredJobs: 1
          });
          expect(await h.admin.get(job.id)).toBeNull();
          expect(await h.chunksOf(job.id)).toEqual([]);
          expect(await h.issues(job.id)).toEqual([]);
        }
      );

      it('keeps a job that has not expired, and one that never expires', async () => {
        const later = await h.insert({
          entity: 'category',
          status: 'validated',
          expiresAt: h.now() + h.retentionMs
        });
        const never = await h.insert({
          entity: 'product',
          status: 'validated',
          expiresAt: null
        });
        expect(await m.cleanUp(UPLOAD_IDLE)).toEqual(none);
        expect(await h.admin.get(later.id)).not.toBeNull();
        expect(await h.admin.get(never.id)).not.toBeNull();
      });

      it.each(['validating', 'queued', 'running', 'uploading'] as JobStatus[])(
        'never deletes a job that is %s, even with a wrong expiry',
        async (status) => {
          const job = await h.insert({
            status,
            expiresAt: ago(MINUTE),
            heartbeatAt: h.now()
          });
          expect(await m.cleanUp(UPLOAD_IDLE)).toEqual(none);
          expect(await h.admin.get(job.id)).not.toBeNull();
        }
      );

      it.each(['completed', 'failed', 'canceled'] as JobStatus[])(
        'drops the file of a %s job with no failed or skipped row, and keeps the job',
        async (status) => {
          const job = await h.insert({
            status,
            expiresAt: h.now() + h.retentionMs,
            counts: counts(0, 0),
            chunkCount: 3
          });
          await h.seedChunks(job.id, [bytes(1), bytes(2), bytes(3)]);
          // One job, not three chunks.
          expect(await m.cleanUp(UPLOAD_IDLE)).toEqual({
            ...none,
            filesDropped: 1
          });
          expect(await h.chunksOf(job.id)).toEqual([]);
          expect(await h.admin.get(job.id)).toMatchObject({
            status,
            // The job says it has no file any more.
            chunkCount: null
          });
          // Once is enough.
          expect(await m.cleanUp(UPLOAD_IDLE)).toEqual(none);
        }
      );

      it.each([
        [1, 0],
        [0, 1],
        [3, 4]
      ])(
        'keeps the file of a finished job with %i failed and %i skipped rows: the download with errors needs it',
        async (failed, skipped) => {
          const job = await h.insert({
            status: 'completed',
            expiresAt: h.now() + h.retentionMs,
            counts: counts(failed, skipped)
          });
          await h.seedChunks(job.id, [bytes(1)]);
          expect(await m.cleanUp(UPLOAD_IDLE)).toEqual(none);
          expect(await h.chunksOf(job.id)).toEqual([bytes(1)]);
        }
      );

      it.each([
        'uploaded',
        'validated',
        'stopped',
        'interrupted'
      ] as JobStatus[])(
        'keeps the file of a job that is %s: Resume, Start and the check need it',
        async (status) => {
          const job = await h.insert({
            status,
            expiresAt: h.now() + h.retentionMs,
            counts: counts(0, 0)
          });
          await h.seedChunks(job.id, [bytes(1)]);
          expect(await m.cleanUp(UPLOAD_IDLE)).toEqual(none);
          expect(await h.chunksOf(job.id)).toEqual([bytes(1)]);
        }
      );

      it('does not count a finished job that has no file', async () => {
        await h.insert({
          status: 'completed',
          expiresAt: h.now() + h.retentionMs,
          counts: counts(0, 0)
        });
        expect(await m.cleanUp(UPLOAD_IDLE)).toEqual(none);
      });

      it('counts each kind of work once when it does all three', async () => {
        const idle = await h.insert({
          status: 'uploading',
          heartbeatAt: ago(11 * MINUTE)
        });
        const old = await h.insert({
          entity: 'category',
          status: 'validated',
          expiresAt: ago(MINUTE)
        });
        const clean = await h.insert({
          entity: 'product',
          status: 'completed',
          expiresAt: h.now() + h.retentionMs,
          counts: counts(0, 0)
        });
        await h.seedChunks(clean.id, [bytes(1)]);
        expect(await m.cleanUp(UPLOAD_IDLE)).toEqual({
          abandonedUploads: 1,
          expiredJobs: 1,
          filesDropped: 1
        });
        expect(await h.admin.get(idle.id)).toBeNull();
        expect(await h.admin.get(old.id)).toBeNull();
        expect(await h.admin.get(clean.id)).not.toBeNull();
      });
    });
  });
}

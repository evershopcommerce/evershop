import { describe, it, expect, beforeEach } from '@jest/globals';
import { emptyCounts } from '../../../services/job/types.js';
import type {
  ImportJob,
  IssuePhase,
  JobCounts,
  JobStatus,
  StoredIssue
} from '../../../services/job/types.js';
import type { JobRepository } from '../../../services/ports/jobRepository.js';

/**
 * What the repository and the test around it need from a store of jobs: the port
 * itself, and the ways to set a job up and look at it without going through the
 * port (the API side of the jobs does not exist yet). The in-memory double and
 * PostgreSQL each bring one.
 */
export interface JobRepoHarness {
  repo: JobRepository;
  /** A job, by default `uploaded` and for categories. The id is the store's. */
  insert(fields?: Partial<ImportJob>): Promise<ImportJob>;
  /** The job as it is stored now. */
  snapshot(jobId: number): Promise<ImportJob>;
  /** The problems in the order they were stored. */
  issues(jobId: number, phase?: IssuePhase): Promise<StoredIssue[]>;
  /** Problems that an earlier run left behind. */
  seedIssues(jobId: number, issues: StoredIssue[]): Promise<void>;
  setControl(jobId: number, control: 'cancel' | null): Promise<void>;
  /** Sets the status as the API would, whatever it was. */
  setStatus(jobId: number, status: JobStatus): Promise<void>;
  /** The job is deleted while a worker runs. */
  delete(jobId: number): Promise<void>;
  /** The time of the store (a fake clock, or the database clock). */
  now(): number;
  /** Lets time pass: the fake clock moves, a real one waits. */
  advance(ms: number): Promise<void>;
  /** How long a finished job is kept. */
  retentionMs: number;
}

const GONE = 987_654_321;

const issue = (
  rowNumber: number | null,
  severity: 'error' | 'warning' = 'error',
  phase: IssuePhase = 'validate'
): StoredIssue => ({
  phase,
  rowNumber,
  entityKey: 'k',
  column: null,
  code: 'INVALID_VALUE',
  severity,
  params: {},
  message: 'm',
  value: null
});

const noWork = { counts: emptyCounts(), issues: [] };

/**
 * What every `JobRepository` must do (§ 4.5, point 6): the status machine of
 * § 8.4, the claim as a compare-and-swap, and every later write fenced by the
 * `attempt`. It runs against the double in the unit tests and against
 * PostgreSQL in the database tests, so a double that behaves differently from
 * the real thing cannot pass.
 *
 * Two indexes of the real table make some states impossible (one open job per
 * entity, one job queued or running in the store), so a test with two jobs gives
 * them different entities and at most one that is queued or running.
 */
export function jobRepositoryContract(
  label: string,
  make: () => Promise<JobRepoHarness>
): void {
  describe(`${label}: the contract of a JobRepository`, () => {
    let h: JobRepoHarness;
    let repo: JobRepository;

    beforeEach(async () => {
      h = await make();
      repo = h.repo;
    });

    /** A claimed job: the attempt a worker would be given. */
    const claimed = async (
      fields: Partial<ImportJob> = {}
    ): Promise<{ id: number; attempt: number }> => {
      const queued = fields.status === 'queued';
      const job = await h.insert({
        status: queued ? 'queued' : 'uploaded',
        ...fields
      });
      const attempt = await repo.claim(
        job.id,
        queued ? 'queued' : 'uploaded',
        queued ? 'running' : 'validating',
        'host:1'
      );
      expect(attempt).not.toBeNull();
      return { id: job.id, attempt: attempt as number };
    };

    describe('get', () => {
      it('gives the job with its fields, and null for a job that is not there', async () => {
        const job = await h.insert({
          entity: 'product',
          mode: 'create',
          fileName: 'products.csv',
          fileSize: 12_345,
          chunkCount: 2,
          fileSha256: 'a'.repeat(64),
          options: { checkImages: true }
        });
        expect(await repo.get(job.id)).toMatchObject({
          id: job.id,
          entity: 'product',
          mode: 'create',
          status: 'uploaded',
          stage: null,
          control: null,
          fileName: 'products.csv',
          fileSize: 12_345,
          chunkCount: 2,
          fileSha256: 'a'.repeat(64),
          options: { checkImages: true },
          errorMessage: null,
          attempt: 0,
          worker: null,
          startedAt: null,
          finishedAt: null,
          expiresAt: null
        });
        expect(typeof (await repo.get(job.id))?.uuid).toBe('string');
        expect(await repo.get(GONE)).toBeNull();
      });

      it('gives counts with every field, also for a job that never wrote any', async () => {
        const job = await h.insert();
        expect((await repo.get(job.id))?.counts).toEqual(emptyCounts());
      });

      it('hands out copies: a worker cannot change a job by holding it', async () => {
        const job = await h.insert();
        const got = (await repo.get(job.id)) as ImportJob;
        got.counts.total = 99;
        got.counts.byCode.validate.X = 1;
        expect((await h.snapshot(job.id)).counts).toEqual(emptyCounts());
      });
    });

    describe('claim', () => {
      it('moves uploaded to validating and queued to running, and raises the attempt', async () => {
        const a = await h.insert({ entity: 'category', status: 'uploaded' });
        const b = await h.insert({ entity: 'product', status: 'queued' });
        const before = h.now();
        expect(await repo.claim(a.id, 'uploaded', 'validating', 'host:1')).toBe(
          1
        );
        expect(await repo.claim(b.id, 'queued', 'running', 'host:2')).toBe(1);
        const first = await h.snapshot(a.id);
        expect(first).toMatchObject({
          status: 'validating',
          attempt: 1,
          worker: 'host:1',
          expiresAt: null
        });
        expect(first.heartbeatAt).toBeGreaterThanOrEqual(before);
        expect((await h.snapshot(b.id)).status).toBe('running');
      });

      it('clears the end of an earlier run: the message and the expiry', async () => {
        const job = await h.insert({
          status: 'uploaded',
          errorMessage: 'The worker was stopped before it finished.',
          expiresAt: h.now() + 1000
        });
        await repo.claim(job.id, 'uploaded', 'validating', 'a');
        expect(await h.snapshot(job.id)).toMatchObject({
          errorMessage: null,
          expiresAt: null
        });
      });

      it('raises the attempt at every claim', async () => {
        const job = await h.insert({ status: 'uploaded' });
        expect(await repo.claim(job.id, 'uploaded', 'validating', 'a')).toBe(1);
        await h.setStatus(job.id, 'uploaded');
        expect(await repo.claim(job.id, 'uploaded', 'validating', 'b')).toBe(2);
      });

      it('is a compare-and-swap: the second claim gets nothing', async () => {
        const job = await h.insert({ status: 'uploaded' });
        expect(await repo.claim(job.id, 'uploaded', 'validating', 'a')).toBe(1);
        expect(
          await repo.claim(job.id, 'uploaded', 'validating', 'b')
        ).toBeNull();
        expect((await h.snapshot(job.id)).worker).toBe('a');
      });

      it('gives the job to one of two workers that ask at the same moment', async () => {
        const job = await h.insert({ status: 'uploaded' });
        const attempts = await Promise.all(
          ['a', 'b', 'c', 'd'].map((worker) =>
            repo.claim(job.id, 'uploaded', 'validating', worker)
          )
        );
        expect(attempts.filter((attempt) => attempt !== null)).toEqual([1]);
        expect((await h.snapshot(job.id)).attempt).toBe(1);
      });

      it('gets nothing for a job that is gone', async () => {
        expect(
          await repo.claim(GONE, 'uploaded', 'validating', 'a')
        ).toBeNull();
      });

      it('refuses a claim that is not one a worker makes', async () => {
        const job = await h.insert({ status: 'validated' });
        await expect(
          repo.claim(job.id, 'validated', 'running', 'a')
        ).rejects.toThrow('cannot claim');
      });
    });

    describe('the fence', () => {
      it('lets the worker with the current attempt write, and no other', async () => {
        const { id, attempt } = await claimed();
        const checkpoint = { counts: emptyCounts(), issues: [issue(2)] };
        expect(await repo.checkpoint(id, attempt, checkpoint)).toEqual({
          ok: true,
          control: null
        });
        expect(await repo.checkpoint(id, attempt + 1, checkpoint)).toEqual({
          ok: false
        });
        expect(await repo.markStarted(id, attempt + 1)).toBe(false);
        expect(await repo.clearIssues(id, attempt + 1, 'validate')).toBe(false);
        expect(await repo.finish(id, attempt + 1, 'validated')).toBe(false);
        expect(await h.issues(id)).toHaveLength(1);
        expect((await h.snapshot(id)).status).toBe('validating');
      });

      it('refuses every write once the job has been finished', async () => {
        const { id, attempt } = await claimed();
        expect(await repo.finish(id, attempt, 'validated')).toBe(true);
        expect(await repo.checkpoint(id, attempt, noWork)).toEqual({
          ok: false
        });
        expect(await repo.markStarted(id, attempt)).toBe(false);
        expect(await repo.clearIssues(id, attempt, 'validate')).toBe(false);
        expect(await repo.finish(id, attempt, 'failed')).toBe(false);
      });

      it('refuses every write once the job is deleted', async () => {
        const { id, attempt } = await claimed();
        await h.delete(id);
        expect(await repo.checkpoint(id, attempt, noWork)).toEqual({
          ok: false
        });
        expect(await repo.markStarted(id, attempt)).toBe(false);
        expect(await repo.clearIssues(id, attempt, 'validate')).toBe(false);
        expect(await repo.finish(id, attempt, 'validated')).toBe(false);
        expect(await repo.get(id)).toBeNull();
      });

      it('refuses every write once the job is canceled or declared dead', async () => {
        for (const status of ['canceled', 'interrupted'] as const) {
          const { id, attempt } = await claimed({ entity: 'product' });
          await h.setStatus(id, status);
          expect(await repo.checkpoint(id, attempt, noWork)).toEqual({
            ok: false
          });
          expect(await repo.finish(id, attempt, 'validated')).toBe(false);
          await h.delete(id);
        }
      });

      it('tells the worker about a cancel', async () => {
        const { id, attempt } = await claimed({ status: 'queued' });
        await h.setControl(id, 'cancel');
        expect(await repo.checkpoint(id, attempt, noWork)).toEqual({
          ok: true,
          control: 'cancel'
        });
      });
    });

    describe('what a checkpoint writes', () => {
      it('writes the counts, the stage, the heartbeat and the problems together', async () => {
        const { id, attempt } = await claimed();
        await h.advance(20);
        const before = h.now();
        const counts: JobCounts = {
          ...emptyCounts(),
          total: 5,
          errors: 1,
          byCode: { validate: { INVALID_VALUE: 1 }, import: {} },
          issuesTruncated: { validate: true, import: false },
          firstUnlistedRow: { validate: 4, import: null }
        };
        await repo.checkpoint(id, attempt, {
          counts,
          stage: 'reading',
          issues: [issue(3)]
        });
        const job = await h.snapshot(id);
        expect(job).toMatchObject({ stage: 'reading', counts });
        expect(job.heartbeatAt).toBeGreaterThanOrEqual(before);
        expect(await h.issues(id, 'validate')).toHaveLength(1);
      });

      it('leaves the stage alone when it is not given, and clears it when it is null', async () => {
        const { id, attempt } = await claimed();
        await repo.checkpoint(id, attempt, { ...noWork, stage: 'lookups' });
        await repo.checkpoint(id, attempt, noWork);
        expect((await h.snapshot(id)).stage).toBe('lookups');
        await repo.checkpoint(id, attempt, { ...noWork, stage: null });
        expect((await h.snapshot(id)).stage).toBeNull();
      });

      it('keeps the problems in the order they were given, over many checkpoints', async () => {
        const { id, attempt } = await claimed();
        const first = Array.from({ length: 30 }, (_, n) => issue(n + 2));
        const second = Array.from({ length: 30 }, (_, n) => issue(n + 100));
        await repo.checkpoint(id, attempt, { ...noWork, issues: first });
        await repo.checkpoint(id, attempt, { ...noWork, issues: second });
        expect((await h.issues(id)).map((i) => i.rowNumber)).toEqual(
          [...first, ...second].map((i) => i.rowNumber)
        );
      });

      it('stores a problem as it was given, with every kind of value', async () => {
        const { id, attempt } = await claimed();
        const given: StoredIssue = {
          phase: 'validate',
          rowNumber: 7,
          entityKey: 'women-"clothes"',
          column: 'parent',
          code: 'REFERENCE_NOT_FOUND',
          severity: 'warning',
          params: {
            reason: 'ünï©ode 日本',
            nested: { list: [1, 2.5, null, true], text: 'a\nb\t"c"\\' },
            positions: [3, 5]
          },
          message: 'Line one.\nLine "two" — ünï©ode.',
          value: 'x'.repeat(100)
        };
        await repo.checkpoint(id, attempt, { ...noWork, issues: [given] });
        expect(await h.issues(id)).toEqual([given]);
      });

      it('stores a problem of the file as a whole, with nothing optional', async () => {
        const { id, attempt } = await claimed();
        const given: StoredIssue = {
          phase: 'validate',
          rowNumber: null,
          entityKey: null,
          column: null,
          code: 'FILE_EMPTY',
          severity: 'error',
          params: {},
          message: 'The file is empty.',
          value: null
        };
        await repo.checkpoint(id, attempt, { ...noWork, issues: [given] });
        expect(await h.issues(id)).toEqual([given]);
      });

      it('keeps the problems of each phase apart, and clears one phase', async () => {
        const { id, attempt } = await claimed({ status: 'queued' });
        await repo.checkpoint(id, attempt, {
          ...noWork,
          issues: [issue(2), issue(3, 'error', 'import')]
        });
        expect(await repo.clearIssues(id, attempt, 'import')).toBe(true);
        expect((await h.issues(id)).map((i) => i.phase)).toEqual(['validate']);
      });

      it('clears nothing from another job', async () => {
        const a = await claimed();
        const other = await h.insert({
          entity: 'product',
          status: 'validated'
        });
        await h.seedIssues(other.id, [issue(2)]);
        await repo.clearIssues(a.id, a.attempt, 'validate');
        expect(await h.issues(other.id)).toHaveLength(1);
      });

      it('says that a clear was made by a worker with the right to, also when there was nothing to clear', async () => {
        const { id, attempt } = await claimed();
        expect(await repo.clearIssues(id, attempt, 'import')).toBe(true);
      });

      it('gives back the rows that have a problem of severity error', async () => {
        const { id, attempt } = await claimed({ status: 'queued' });
        await repo.checkpoint(id, attempt, {
          ...noWork,
          issues: [
            issue(4, 'error', 'import'),
            issue(4, 'error', 'import'),
            issue(5, 'warning', 'import'),
            issue(null, 'error', 'import'),
            issue(6, 'error', 'validate')
          ]
        });
        expect([...(await repo.errorRows(id, 'import'))]).toEqual([4]);
        expect([...(await repo.errorRows(id, 'validate'))]).toEqual([6]);
      });

      it('gives back the rows of that job only', async () => {
        const { id, attempt } = await claimed();
        const other = await h.insert({
          entity: 'product',
          status: 'validated'
        });
        await h.seedIssues(other.id, [
          issue(8, 'error', 'import'),
          issue(9, 'error', 'validate')
        ]);
        await repo.checkpoint(id, attempt, {
          ...noWork,
          issues: [issue(3, 'error', 'import'), issue(4, 'error', 'validate')]
        });
        expect([...(await repo.errorRows(id, 'import'))]).toEqual([3]);
        expect([...(await repo.errorRows(id, 'validate'))]).toEqual([4]);
        expect([...(await repo.errorRows(other.id, 'import'))]).toEqual([8]);
      });

      it('sets started_at once and never clears it', async () => {
        const { id, attempt } = await claimed({ status: 'queued' });
        const before = h.now();
        expect(await repo.markStarted(id, attempt)).toBe(true);
        const first = (await h.snapshot(id)).startedAt;
        expect(first).toBeGreaterThanOrEqual(before);
        await h.advance(20);
        expect(await repo.markStarted(id, attempt)).toBe(true);
        expect((await h.snapshot(id)).startedAt).toBe(first);
      });
    });

    describe('issuesInRowOrder', () => {
      const messages = async (id: number, phase: IssuePhase) => {
        const got: string[] = [];
        for await (const one of repo.issuesInRowOrder(id, phase)) {
          got.push(one.message);
        }
        return got;
      };
      const stored = (
        phase: IssuePhase,
        rowNumber: number | null,
        message: string
      ): StoredIssue => ({ ...issue(rowNumber, 'error', phase), message });

      it('lists the problems of a phase with no row first, then by row, and in the order found inside a row', async () => {
        const job = await h.insert({ status: 'validated' });
        const other = await h.insert({ entity: 'product' });
        await h.seedIssues(job.id, [
          stored('validate', 9, 'nine'),
          stored('validate', 3, 'three-a'),
          stored('import', 1, 'import row'),
          stored('validate', null, 'file'),
          stored('validate', 3, 'three-b'),
          stored('validate', 2, 'two')
        ]);
        await h.seedIssues(other.id, [stored('validate', 1, 'another job')]);
        expect(await messages(job.id, 'validate')).toEqual([
          'file',
          'two',
          'three-a',
          'three-b',
          'nine'
        ]);
        expect(await messages(job.id, 'import')).toEqual(['import row']);
      });

      it('lists nothing for a job without problems', async () => {
        const job = await h.insert();
        expect(await messages(job.id, 'import')).toEqual([]);
      });

      it('lists a long list whole and in order, across the pages it is read in', async () => {
        const job = await h.insert({ status: 'validated' });
        const file = Array.from({ length: 1200 }, (_, n) =>
          stored('validate', null, `f${String(n).padStart(4, '0')}`)
        );
        // Rows come in an order that is not the order of the rows.
        const rows = Array.from({ length: 2300 }, (_, n) => {
          const row = ((n * 7919) % 1150) + 2;
          return stored(
            'validate',
            row,
            `r${String(row).padStart(4, '0')}-${n}`
          );
        });
        await h.seedIssues(job.id, [...rows, ...file]);
        const expected = [
          ...file.map((i) => i.message),
          ...[...rows]
            .map((i, n) => ({ i, n }))
            .sort((a, b) => a.i.rowNumber! - b.i.rowNumber! || a.n - b.n)
            .map(({ i }) => i.message)
        ];
        expect(await messages(job.id, 'validate')).toEqual(expected);
      });
    });

    describe('the end of a run', () => {
      it.each(['validated', 'failed', 'canceled', 'interrupted'] as const)(
        'lets validating end in %s',
        async (to) => {
          const { id, attempt } = await claimed();
          expect(await repo.finish(id, attempt, to)).toBe(true);
          expect((await h.snapshot(id)).status).toBe(to);
        }
      );

      it.each([
        'completed',
        'stopped',
        'queued',
        'running',
        'uploaded'
      ] as const)('does not let validating end in %s', async (to) => {
        const { id, attempt } = await claimed();
        await expect(repo.finish(id, attempt, to)).rejects.toThrow();
        expect((await h.snapshot(id)).status).toBe('validating');
      });

      it.each([
        'completed',
        'stopped',
        'interrupted',
        'failed',
        'canceled'
      ] as const)('lets running end in %s', async (to) => {
        const { id, attempt } = await claimed({
          status: 'queued',
          startedAt: 1
        });
        expect(await repo.finish(id, attempt, to)).toBe(true);
        expect((await h.snapshot(id)).status).toBe(to);
      });

      it('sends a running job back to validated only if it has written nothing', async () => {
        const first = await claimed({ status: 'queued' });
        expect(
          await repo.finish(first.id, first.attempt, 'validated', {
            errorMessage: 'back'
          })
        ).toBe(true);
        expect(await h.snapshot(first.id)).toMatchObject({
          status: 'validated',
          errorMessage: 'back'
        });
        await h.delete(first.id);
        const second = await claimed({ status: 'queued', startedAt: 5 });
        await expect(
          repo.finish(second.id, second.attempt, 'validated')
        ).rejects.toThrow('written something');
        expect((await h.snapshot(second.id)).status).toBe('running');
      });

      it('sets finished_at for a final status, expires_at for every end, and clears the stage and the control', async () => {
        const first = await claimed({
          status: 'queued',
          stage: 'writing',
          control: 'cancel'
        });
        const before = h.now();
        await repo.finish(first.id, first.attempt, 'completed');
        const job = await h.snapshot(first.id);
        expect(job.finishedAt).toBeGreaterThanOrEqual(before);
        expect(job.expiresAt).toBeGreaterThanOrEqual(before + h.retentionMs);
        expect(job.expiresAt).toBeLessThan(before + h.retentionMs + 60_000);
        expect([job.stage, job.control]).toEqual([null, null]);
        await h.delete(first.id);

        const second = await claimed({ status: 'queued' });
        await repo.finish(second.id, second.attempt, 'stopped');
        const stopped = await h.snapshot(second.id);
        expect(stopped.finishedAt).toBeNull();
        expect(stopped.expiresAt).not.toBeNull();
      });

      it('writes what it is given with the end, and leaves the rest alone', async () => {
        const { id, attempt } = await claimed();
        const counts = { ...emptyCounts(), total: 12, errors: 3 };
        await repo.checkpoint(id, attempt, {
          counts: { ...emptyCounts(), total: 1 },
          issues: []
        });
        expect(await repo.finish(id, attempt, 'validated')).toBe(true);
        // No patch: the counts and the message stay as they were.
        expect(await h.snapshot(id)).toMatchObject({
          counts: { total: 1 },
          errorMessage: null
        });
        const second = await claimed({ entity: 'product' });
        await repo.finish(second.id, second.attempt, 'failed', {
          errorMessage: 'The uploaded file is damaged',
          counts
        });
        expect(await h.snapshot(second.id)).toMatchObject({
          status: 'failed',
          errorMessage: 'The uploaded file is damaged',
          counts: { total: 12, errors: 3 }
        });
      });

      it('sets the message when it is given one, and clears it when it is given null', async () => {
        // A job a worker holds with a message on it (set by an earlier end).
        const job = await h.insert({
          status: 'validating',
          attempt: 1,
          errorMessage: 'old'
        });
        expect(
          await repo.finish(job.id, 1, 'interrupted', { errorMessage: 'new' })
        ).toBe(true);
        expect((await h.snapshot(job.id)).errorMessage).toBe('new');
        const second = await h.insert({
          entity: 'product',
          status: 'validating',
          attempt: 1,
          errorMessage: 'old'
        });
        expect(
          await repo.finish(second.id, 1, 'validated', { errorMessage: null })
        ).toBe(true);
        expect((await h.snapshot(second.id)).errorMessage).toBeNull();
      });
    });
  });
}

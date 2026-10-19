import {
  CLAIMS,
  FINAL,
  FINISH_FROM,
  RETENTION_MS,
  WORKER_STATUSES
} from '../services/job/transitions.js';
import { cloneCounts, emptyCounts } from '../services/job/types.js';
import type {
  ImportJob,
  IssuePhase,
  JobStatus,
  StoredIssue
} from '../services/job/types.js';
import type { Clock } from '../services/ports/clock.js';
import type {
  Checkpoint,
  CheckpointResult,
  FinishPatch,
  JobRepository
} from '../services/ports/jobRepository.js';

/**
 * TEST-ONLY. A `JobRepository` with the status machine of § 8.4: the claim is a
 * compare-and-swap that raises the `attempt`, and every later write is fenced by
 * it, so a worker that is stale (the job was deleted, canceled, declared dead or
 * claimed again) gets `false` and must stop. The same contract suite is to run
 * against `PgJobRepository`.
 */
export class MemoryJobRepository implements JobRepository {
  protected readonly jobs = new Map<number, ImportJob>();

  protected rows: Array<StoredIssue & { jobId: number }> = [];

  protected nextId = 1;

  /** How many checkpoints were written, and the failures a test asks for. */
  checkpoints = 0;

  private failures = 0;

  constructor(
    protected readonly clock: Clock,
    protected readonly retentionMs = RETENTION_MS
  ) {}

  // ---- for a test to set up and look at --------------------------------

  /** A job, by default `uploaded` and for categories. */
  insert(fields: Partial<ImportJob> = {}): ImportJob {
    const id = fields.id ?? this.nextId;
    this.nextId = Math.max(this.nextId, id) + 1;
    const job: ImportJob = {
      id,
      uuid: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
      entity: 'category',
      mode: 'upsert',
      status: 'uploaded',
      stage: null,
      control: null,
      fileName: 'categories.csv',
      fileSize: 0,
      chunkCount: null,
      fileSha256: null,
      options: {},
      counts: emptyCounts(),
      errorMessage: null,
      attempt: 0,
      worker: null,
      startedAt: null,
      finishedAt: null,
      heartbeatAt: null,
      expiresAt: null,
      createdAt: this.clock.now(),
      statusChangedAt: this.clock.now(),
      validatedAt: null,
      waitingSince: null,
      createdBy: null,
      ...fields
    };
    this.jobs.set(id, job);
    return job;
  }

  /** The job itself, not a copy: for a test of a repository that hands out live objects. */
  live(jobId: number): ImportJob {
    return this.mustHave(jobId);
  }

  /** The job as it is now (a copy). */
  snapshot(jobId: number): ImportJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`No job ${jobId}`);
    return { ...job, counts: cloneCounts(job.counts) };
  }

  issues(jobId: number, phase?: IssuePhase): StoredIssue[] {
    return this.rows
      .filter((row) => row.jobId === jobId && (!phase || row.phase === phase))
      .map(({ jobId: _job, ...issue }) => issue);
  }

  /** Problems that an earlier run left behind. */
  seedIssues(jobId: number, issues: StoredIssue[]): void {
    for (const issue of issues) {
      this.rows.push({ ...issue, jobId });
    }
  }

  /** Sets the counts, as when the last seconds of progress were lost. */
  setCounts(jobId: number, counts: ImportJob['counts']): void {
    this.mustHave(jobId).counts = cloneCounts(counts);
  }

  setControl(jobId: number, control: 'cancel' | null): void {
    this.mustHave(jobId).control = control;
  }

  setStatus(jobId: number, status: JobStatus): void {
    this.mustHave(jobId).status = status;
  }

  /** The job is deleted while a worker runs. */
  delete(jobId: number): void {
    this.jobs.delete(jobId);
    this.rows = this.rows.filter((row) => row.jobId !== jobId);
  }

  /** Someone else claimed the job: the worker's attempt is stale. */
  bumpAttempt(jobId: number): void {
    this.mustHave(jobId).attempt += 1;
  }

  /** The next `n` checkpoints throw, as a database that hiccups. */
  failNextCheckpoints(n: number): void {
    this.failures = n;
  }

  protected mustHave(jobId: number): ImportJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`No job ${jobId}`);
    return job;
  }

  // ---- the port --------------------------------------------------------

  async get(jobId: number): Promise<ImportJob | null> {
    const job = this.jobs.get(jobId);
    return job ? this.snapshot(jobId) : null;
  }

  async claim(
    jobId: number,
    from: JobStatus,
    to: JobStatus,
    worker: string
  ): Promise<number | null> {
    if (!CLAIMS.some(([a, b]) => a === from && b === to)) {
      throw new Error(`A worker cannot claim ${from} → ${to}`);
    }
    const job = this.jobs.get(jobId);
    if (!job || job.status !== from) {
      return null;
    }
    job.status = to;
    job.statusChangedAt = this.clock.now();
    job.attempt += 1;
    job.worker = worker;
    job.heartbeatAt = this.clock.now();
    job.expiresAt = null;
    job.errorMessage = null;
    job.waitingSince = null;
    return job.attempt;
  }

  private fenced(jobId: number, attempt: number): ImportJob | null {
    const job = this.jobs.get(jobId);
    if (
      !job ||
      job.attempt !== attempt ||
      !(WORKER_STATUSES as readonly string[]).includes(job.status)
    ) {
      return null;
    }
    return job;
  }

  async clearIssues(
    jobId: number,
    attempt: number,
    phase: IssuePhase
  ): Promise<boolean> {
    if (!this.fenced(jobId, attempt)) return false;
    this.rows = this.rows.filter(
      (row) => !(row.jobId === jobId && row.phase === phase)
    );
    return true;
  }

  async checkpoint(
    jobId: number,
    attempt: number,
    checkpoint: Checkpoint
  ): Promise<CheckpointResult> {
    if (this.failures > 0) {
      this.failures -= 1;
      throw new Error('connection terminated');
    }
    const job = this.fenced(jobId, attempt);
    if (!job) return { ok: false };
    job.counts = cloneCounts(checkpoint.counts);
    if (checkpoint.stage !== undefined) job.stage = checkpoint.stage;
    job.heartbeatAt = this.clock.now();
    for (const issue of checkpoint.issues) {
      this.rows.push({ ...issue, jobId });
    }
    this.checkpoints += 1;
    return { ok: true, control: job.control };
  }

  async markStarted(jobId: number, attempt: number): Promise<boolean> {
    const job = this.fenced(jobId, attempt);
    if (!job) return false;
    job.startedAt ??= this.clock.now();
    return true;
  }

  async setWaiting(
    jobId: number,
    attempt: number,
    waiting: boolean
  ): Promise<boolean> {
    const job = this.fenced(jobId, attempt);
    if (!job) return false;
    job.waitingSince = waiting ? job.waitingSince ?? this.clock.now() : null;
    return true;
  }

  async errorRows(jobId: number, phase: IssuePhase): Promise<Set<number>> {
    return new Set(
      this.rows
        .filter(
          (row) =>
            row.jobId === jobId &&
            row.phase === phase &&
            row.severity === 'error' &&
            row.rowNumber !== null
        )
        .map((row) => row.rowNumber as number)
    );
  }

  async *issuesInRowOrder(
    jobId: number,
    phase: IssuePhase
  ): AsyncGenerator<StoredIssue, void, undefined> {
    // The sort is stable: inside a row the problems stay in the order found.
    const found = this.rows
      .filter((row) => row.jobId === jobId && row.phase === phase)
      .sort((a, b) => (a.rowNumber ?? 0) - (b.rowNumber ?? 0));
    for (const row of found) {
      const { jobId: _job, ...issue } = row;
      yield issue;
    }
  }

  async finish(
    jobId: number,
    attempt: number,
    to: JobStatus,
    patch: FinishPatch = {}
  ): Promise<boolean> {
    const job = this.fenced(jobId, attempt);
    if (!job) return false;
    if (!FINISH_FROM[job.status].includes(to)) {
      throw new Error(`A worker cannot take a job from ${job.status} to ${to}`);
    }
    if (
      job.status === 'running' &&
      to === 'validated' &&
      job.startedAt !== null
    ) {
      throw new Error(
        'A job that has written something cannot go back to validated'
      );
    }
    job.status = to;
    job.statusChangedAt = this.clock.now();
    if (to === 'validated') job.validatedAt = this.clock.now();
    if (patch.errorMessage !== undefined) job.errorMessage = patch.errorMessage;
    if (patch.counts) job.counts = cloneCounts(patch.counts);
    job.stage = null;
    job.control = null;
    job.waitingSince = null;
    job.heartbeatAt = this.clock.now();
    if (FINAL.has(to)) job.finishedAt = this.clock.now();
    job.expiresAt = this.clock.now() + this.retentionMs;
    return true;
  }
}

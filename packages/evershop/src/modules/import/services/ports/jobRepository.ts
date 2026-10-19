import type {
  ImportJob,
  IssuePhase,
  JobCounts,
  JobStage,
  JobStatus,
  StoredIssue
} from '../job/types.js';

/** What a checkpoint writes: the counts, the new problems and the stage, together. */
export interface Checkpoint {
  counts: JobCounts;
  stage?: JobStage | null;
  issues: StoredIssue[];
}

export interface FinishPatch {
  errorMessage?: string | null;
  counts?: JobCounts;
}

export type CheckpointResult =
  | { ok: true; control: 'cancel' | null }
  /** The job was deleted, canceled, declared dead, or claimed by a newer attempt. */
  | { ok: false };

/**
 * The jobs, as the worker sees them (§ 4.5, point 2; § 8.4). Every write after
 * the claim carries the `attempt` the worker was given, and **fails when it is
 * stale**: the worker then stops at once, before its next service call, so one
 * that recovery has given up on cannot write beside its replacement.
 *
 * The real one is `PgJobRepository`; the test double is `MemoryJobRepository`,
 * with the same status machine. The API side (upload, start, cancel, resume,
 * delete) and the cron jobs add their own operations.
 */
export interface JobRepository {
  get(jobId: number): Promise<ImportJob | null>;

  /**
   * Compare-and-swap on the status: `from` → `to`, `attempt` + 1, the worker and
   * the heartbeat set. Returns the new `attempt`, or null when someone else got
   * there first or the job is gone: the worker exits quietly.
   */
  claim(
    jobId: number,
    from: JobStatus,
    to: JobStatus,
    worker: string
  ): Promise<number | null>;

  /** Entering `validating` and the check at the start begin from row 1. */
  clearIssues(
    jobId: number,
    attempt: number,
    phase: IssuePhase
  ): Promise<boolean>;

  /**
   * The heartbeat: the counts, the new problems and the stage in one step, with
   * the fencing condition, so that a checkpoint never has problems without the
   * matching `lastUnit` or the reverse. Also tells the worker about `control`.
   */
  checkpoint(
    jobId: number,
    attempt: number,
    checkpoint: Checkpoint
  ): Promise<CheckpointResult>;

  /** Sets `started_at` the first time a worker begins to write. */
  markStarted(jobId: number, attempt: number): Promise<boolean>;

  /**
   * Says that the worker is waiting for the event queue (`waiting_since`, by the
   * clock of the store, § 8.5) or that it is not any more. A job that is
   * already waiting keeps the time it began. Written at once and not with the
   * next heartbeat, so that the page shows "Slowing down" without a delay.
   * False when the write is stale.
   */
  setWaiting(
    jobId: number,
    attempt: number,
    waiting: boolean
  ): Promise<boolean>;

  /**
   * The row numbers that have a problem of severity `error` in a phase: the
   * rows that failed or were skipped (resume retries them first).
   */
  errorRows(jobId: number, phase: IssuePhase): Promise<Set<number>>;

  /**
   * The problems of a phase for the file with errors (§ 7.3): those without a
   * row first, then by row number, and inside a row in the order they were
   * found. It streams, so a job with 100,000 problems is not held in memory.
   */
  issuesInRowOrder(
    jobId: number,
    phase: IssuePhase
  ): AsyncIterable<StoredIssue>;

  /**
   * The final write of a run: `to` is one of the statuses a worker may leave
   * `validating` or `running` for (§ 8.4, transitions). False when stale.
   */
  finish(
    jobId: number,
    attempt: number,
    to: JobStatus,
    patch?: FinishPatch
  ): Promise<boolean>;
}

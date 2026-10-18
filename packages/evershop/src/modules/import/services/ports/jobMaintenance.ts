import type { ImportEntity } from '../types.js';

/** A job the recovery has given up on. */
export interface RecoveredJob {
  uuid: string;
  entity: ImportEntity;
  /** What the dead worker was doing. */
  was: 'validating' | 'running';
}

/** What a clean-up deleted. */
export interface CleanupResult {
  /** Uploads with no chunk for too long, with their chunks. */
  abandonedUploads: number;
  /** Jobs past `expires_at`, with their file and problems. */
  expiredJobs: number;
  /** Jobs that ended clean and lost their file (the job itself stays). */
  filesDropped: number;
}

/**
 * What the cron jobs do to the table of jobs (§ 8.4, Heartbeat and recovery,
 * Cleanup; the dispatch cron). Every method is idempotent and safe to run on
 * every instance at once, and every time is the database's `now()`. The real one
 * is `PgJobMaintenance`; the test double is `MemoryJobStore`.
 */
export interface JobMaintenance {
  /**
   * `validating` and `running` jobs whose last heartbeat is older than
   * `deadAfterMs` become `interrupted`, with `message`, and are kept for the
   * retention (Resume or Delete follows). The worker that wrote the heartbeat
   * is fenced out at once: its next write finds the job not in a status a
   * worker owns.
   */
  recoverDead(deadAfterMs: number, message: string): Promise<RecoveredJob[]>;

  /**
   * The uuids of the jobs that are `uploaded` or `queued` and have been for
   * longer than `quietMs`, the longest waiting first.
   */
  waitingForWorker(quietMs: number): Promise<string[]>;

  /**
   * Deletes the uploads with no chunk for `uploadIdleMs`, the jobs past their
   * `expires_at` (never one that is active), and the file of a `completed`,
   * `failed` or `canceled` job that has no failed or skipped row, since the
   * download with errors is the only use left for it.
   */
  cleanUp(uploadIdleMs: number): Promise<CleanupResult>;
}

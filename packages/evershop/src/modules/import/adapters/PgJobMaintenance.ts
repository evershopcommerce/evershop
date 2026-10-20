import type { Pool } from 'pg';
import { RETENTION_MS } from '../services/job/transitions.js';
import { ACTIVE_STATUSES } from '../services/job/types.js';
import type {
  CleanupResult,
  JobMaintenance,
  RecoveredJob
} from '../services/ports/jobMaintenance.js';
import { noNul } from './pgJobRows.js';

export interface PgJobMaintenanceOptions {
  /** How long an interrupted job is kept, by the database clock (§ 8.4, Cleanup). */
  retentionMs?: number;
}

const MS = `* interval '1 millisecond'`;

/**
 * What the cron jobs do to the jobs, in PostgreSQL (§ 8.4). It takes the pool as
 * an argument, so a test can point it anywhere. Every method is a statement or
 * two that can run on every instance at the same time: the recovery locks the
 * rows it takes with `SKIP LOCKED`, so two instances never take the same job,
 * and a row a live worker is writing at that moment is left for the next round.
 * Times are the database's `now()`.
 */
export class PgJobMaintenance implements JobMaintenance {
  private readonly retentionMs: number;

  constructor(
    private readonly pool: Pool,
    options: PgJobMaintenanceOptions = {}
  ) {
    this.retentionMs = options.retentionMs ?? RETENTION_MS;
  }

  async recoverDead(
    deadAfterMs: number,
    message: string
  ): Promise<RecoveredJob[]> {
    // The condition is checked again on the row once the lock is held, so a
    // checkpoint that lands first keeps the job alive.
    const result = await this.pool.query(
      `WITH dead AS (
         SELECT import_job_id, status FROM import_job
          WHERE status IN ('validating','running')
            AND COALESCE(heartbeat_at, status_changed_at) < now() - ($1 ${MS})
          ORDER BY import_job_id
          FOR UPDATE SKIP LOCKED
       )
       UPDATE import_job j
          SET status = 'interrupted', status_changed_at = now(), stage = NULL,
              control = NULL, waiting_since = NULL, error_message = $3,
              expires_at = now() + ($2 ${MS})
         FROM dead
        WHERE j.import_job_id = dead.import_job_id
        RETURNING j.import_job_id, j.uuid, j.entity, dead.status AS was`,
      [deadAfterMs, this.retentionMs, noNul(message)]
    );
    return [...result.rows]
      .sort((a, b) => a.import_job_id - b.import_job_id)
      .map((row) => ({ uuid: row.uuid, entity: row.entity, was: row.was }));
  }

  async waitingForWorker(quietMs: number): Promise<string[]> {
    const result = await this.pool.query(
      `SELECT uuid FROM import_job
        WHERE status IN ('uploaded','queued')
          AND status_changed_at < now() - ($1 ${MS})
        ORDER BY status_changed_at, import_job_id`,
      [quietMs]
    );
    return result.rows.map((row) => row.uuid as string);
  }

  async cleanUp(uploadIdleMs: number): Promise<CleanupResult> {
    // The foreign keys take the chunks and the problems with a job.
    const uploads = await this.pool.query(
      `DELETE FROM import_job
        WHERE status = 'uploading'
          AND COALESCE(heartbeat_at, created_at) < now() - ($1 ${MS})`,
      [uploadIdleMs]
    );
    // A job a worker owns has no expiry; the status is checked as well, so that
    // a wrong `expires_at` could never delete a running import.
    const expired = await this.pool.query(
      `DELETE FROM import_job
        WHERE expires_at < now() AND NOT (status = ANY($1::text[]))`,
      [ACTIVE_STATUSES]
    );
    // Nothing failed or was skipped: the file has no other use (the download
    // with errors is for the rows that did not go in).
    const files = await this.pool.query(
      `WITH dropped AS (
         DELETE FROM import_job_file f
          USING import_job j
          WHERE f.import_job_id = j.import_job_id
            AND j.status IN ('completed','failed','canceled')
            AND COALESCE((j.counts->>'failed')::int, 0) = 0
            AND COALESCE((j.counts->>'skipped')::int, 0) = 0
          RETURNING f.import_job_id
       ), told AS (
         UPDATE import_job SET chunk_count = NULL
          WHERE import_job_id IN (SELECT import_job_id FROM dropped)
       )
       SELECT count(DISTINCT import_job_id)::int AS jobs FROM dropped`
    );
    return {
      abandonedUploads: uploads.rowCount ?? 0,
      expiredJobs: expired.rowCount ?? 0,
      filesDropped: files.rows[0].jobs
    };
  }
}

import type { Pool } from 'pg';
import { RETENTION_MS } from '../services/job/transitions.js';
import {
  ACTIVE_STATUSES,
  OPEN_STATUSES,
  RESUMABLE_STATUSES
} from '../services/job/types.js';
import type { ImportJob, JobStatus } from '../services/job/types.js';
import type {
  CancelResult,
  IssuePage,
  IssueQuery,
  JobAdmin,
  NewUpload,
  ResumeResult,
  Simple,
  StartResult,
  UploadedFile,
  UploadResult
} from '../services/ports/jobAdmin.js';
import type { ImportEntity } from '../services/types.js';
import {
  COLUMNS,
  inTransaction,
  jsonText,
  noNul,
  toIssue,
  toJob
} from './pgJobRows.js';

const ONE_OPEN_PER_ENTITY = 'IMPORT_JOB_ONE_OPEN_PER_ENTITY';
const ONE_IMPORT_AT_A_TIME = 'IMPORT_JOB_ONE_IMPORT_AT_A_TIME';

/** The unique index a failed write ran into, or null for any other error. */
function violatedIndex(error: unknown): string | null {
  const { code, constraint } = error as { code?: string; constraint?: string };
  return code === '23505' && constraint ? constraint : null;
}

export interface PgJobAdminOptions {
  /** How long a job that ends is kept, by the database clock (§ 8.4, Cleanup). */
  retentionMs?: number;
}

/**
 * The jobs for the API, in PostgreSQL (§ 8.3, 8.4). It takes the pool as an
 * argument, so a test can point it anywhere. Every action is one statement that
 * changes the row only when it is in a status the action allows (a
 * compare-and-swap), and the rules that must hold whatever the instance are the
 * two unique indexes of the table: a write that runs into one is turned into the
 * refusal it stands for. When a statement changes nothing, a second read tells
 * why. Times are the database's `now()`.
 */
export class PgJobAdmin implements JobAdmin {
  private readonly retentionMs: number;

  constructor(private readonly pool: Pool, options: PgJobAdminOptions = {}) {
    this.retentionMs = options.retentionMs ?? RETENTION_MS;
  }

  /** `now()` plus the retention, as an expression with the retention at `$n`. */
  private static expiry(n: number): string {
    return `now() + ($${n} * interval '1 millisecond')`;
  }

  async get(jobId: number): Promise<ImportJob | null> {
    const result = await this.pool.query(
      `SELECT ${COLUMNS} FROM import_job WHERE import_job_id = $1`,
      [jobId]
    );
    return result.rows.length === 0 ? null : toJob(result.rows[0]);
  }

  async getByUuid(uuid: string): Promise<ImportJob | null> {
    const result = await this.pool.query(
      `SELECT ${COLUMNS} FROM import_job WHERE uuid = $1`,
      [uuid]
    );
    return result.rows.length === 0 ? null : toJob(result.rows[0]);
  }

  async entityBusy(entity: ImportEntity): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT 1 FROM import_job
        WHERE entity = $1
          AND (status = 'running' OR (status = 'queued' AND started_at IS NOT NULL))
        LIMIT 1`,
      [entity]
    );
    return result.rows.length > 0;
  }

  async beginUpload(upload: NewUpload): Promise<ImportJob> {
    const result = await this.pool.query(
      `INSERT INTO import_job (entity, mode, status, file_name, options, created_by)
       VALUES ($1, $2, 'uploading', $3, $4::jsonb, $5)
       RETURNING ${COLUMNS}`,
      [
        upload.entity,
        upload.mode,
        noNul(upload.fileName),
        jsonText(upload.options),
        upload.createdBy
      ]
    );
    return toJob(result.rows[0]);
  }

  async addChunk(
    jobId: number,
    seq: number,
    data: Uint8Array
  ): Promise<boolean> {
    const result = await this.pool.query(
      `WITH job AS (
         UPDATE import_job SET heartbeat_at = now()
          WHERE import_job_id = $1 AND status = 'uploading'
          RETURNING import_job_id
       )
       INSERT INTO import_job_file (import_job_id, seq, data)
       SELECT import_job_id, $2, $3 FROM job`,
      [jobId, seq, Buffer.from(data)]
    );
    return result.rowCount === 1;
  }

  async completeUpload(
    jobId: number,
    file: UploadedFile
  ): Promise<UploadResult> {
    return inTransaction(this.pool, async (client): Promise<UploadResult> => {
      // Every job of the entity is locked, in one order, so that two swaps (and
      // a Start, a Resume) take their turns and cannot deadlock.
      const locked = await client.query(
        `SELECT import_job_id, entity, status, started_at FROM import_job
          WHERE entity = (SELECT entity FROM import_job WHERE import_job_id = $1)
          ORDER BY import_job_id
          FOR UPDATE`,
        [jobId]
      );
      const own = locked.rows.find((row) => row.import_job_id === jobId);
      if (!own || own.status !== 'uploading') {
        return { ok: false, reason: 'gone' };
      }
      const busy = locked.rows.some(
        (row) =>
          row.import_job_id !== jobId &&
          (row.status === 'running' ||
            (row.status === 'queued' && row.started_at !== null))
      );
      if (busy) {
        return { ok: false, reason: 'import_running' };
      }
      const { entity } = own;
      // Jobs nobody has written for are deleted; their file and problems go
      // with them through the foreign keys.
      // (This job is `uploading`, which none of the statuses below is.)
      const deleted = await client.query(
        `DELETE FROM import_job
          WHERE entity = $1
            AND (status IN ('uploaded','validating','validated')
                 OR (status = 'queued' AND started_at IS NULL)
                 OR (status IN ('stopped','interrupted') AND started_at IS NULL))`,
        [entity]
      );
      // A stopped or interrupted job that wrote something is closed, not deleted.
      const closed = await client.query(
        `UPDATE import_job
            SET status = 'canceled', status_changed_at = now(), finished_at = now(),
                expires_at = ${PgJobAdmin.expiry(
                  2
                )}, stage = NULL, control = NULL
          WHERE entity = $1
            AND status IN ('stopped','interrupted') AND started_at IS NOT NULL
          RETURNING import_job_id`,
        [entity, this.retentionMs]
      );
      // An entity never has more than one staged file: the file a finished job
      // kept for its download with errors goes too, and the job stays as history.
      await client.query(
        `DELETE FROM import_job_file
          WHERE import_job_id IN (
            SELECT import_job_id FROM import_job
             WHERE entity = $1
               AND status IN ('completed','failed','canceled'))`,
        [entity]
      );
      const updated = await client.query(
        `UPDATE import_job
            SET status = 'uploaded', file_size = $2, chunk_count = $3,
                file_sha256 = $4, status_changed_at = now(), heartbeat_at = now(),
                expires_at = ${PgJobAdmin.expiry(5)}
          WHERE import_job_id = $1
          RETURNING ${COLUMNS}`,
        [jobId, file.size, file.chunkCount, file.sha256, this.retentionMs]
      );
      return {
        ok: true,
        job: toJob(updated.rows[0]),
        replaced: (deleted.rowCount ?? 0) + (closed.rowCount ?? 0) > 0
      };
    });
  }

  async abortUpload(jobId: number): Promise<void> {
    await this.pool.query(
      `DELETE FROM import_job WHERE import_job_id = $1 AND status = 'uploading'`,
      [jobId]
    );
  }

  /** Why an action changed nothing: the job is not there, or it is in another status. */
  private async refusal(
    jobId: number
  ): Promise<
    | { ok: false; reason: 'not_found' }
    | { ok: false; reason: 'wrong_status'; status: JobStatus }
  > {
    const job = await this.get(jobId);
    return job
      ? { ok: false, reason: 'wrong_status', status: job.status }
      : { ok: false, reason: 'not_found' };
  }

  /** The entity of the import that holds the "one at a time" slot. */
  private async runningEntity(): Promise<ImportEntity> {
    const result = await this.pool.query(
      `SELECT entity FROM import_job WHERE status IN ('queued','running') LIMIT 1`
    );
    return result.rows[0]?.entity as ImportEntity;
  }

  async start(jobId: number): Promise<StartResult> {
    try {
      const result = await this.pool.query(
        `UPDATE import_job
            SET status = 'queued', status_changed_at = now(), expires_at = NULL,
                error_message = NULL, control = NULL
          WHERE import_job_id = $1 AND status = 'validated'
            AND COALESCE((counts->>'errors')::int, 0) = 0
          RETURNING ${COLUMNS}`,
        [jobId]
      );
      if (result.rows.length === 1) {
        return { ok: true, job: toJob(result.rows[0]) };
      }
    } catch (e) {
      if (violatedIndex(e) === ONE_IMPORT_AT_A_TIME) {
        return {
          ok: false,
          reason: 'import_running',
          entity: await this.runningEntity()
        };
      }
      throw e;
    }
    const job = await this.get(jobId);
    if (!job) return { ok: false, reason: 'not_found' };
    if (job.status === 'validated' && job.counts.errors > 0) {
      return { ok: false, reason: 'file_has_errors' };
    }
    return { ok: false, reason: 'wrong_status', status: job.status };
  }

  async cancel(jobId: number): Promise<CancelResult> {
    const direct = await this.pool.query(
      `UPDATE import_job
          SET status = 'canceled', status_changed_at = now(), finished_at = now(),
              expires_at = ${PgJobAdmin.expiry(2)}, stage = NULL, control = NULL
        WHERE import_job_id = $1 AND status = 'queued'
        RETURNING ${COLUMNS}`,
      [jobId, this.retentionMs]
    );
    if (direct.rows.length === 1) {
      return { ok: true, how: 'canceled', job: toJob(direct.rows[0]) };
    }
    const asked = await this.pool.query(
      `UPDATE import_job SET control = 'cancel'
        WHERE import_job_id = $1 AND status IN ('validating','running')
        RETURNING ${COLUMNS}`,
      [jobId]
    );
    if (asked.rows.length === 1) {
      return { ok: true, how: 'requested', job: toJob(asked.rows[0]) };
    }
    return this.refusal(jobId);
  }

  async resume(jobId: number): Promise<ResumeResult> {
    try {
      const result = await this.pool.query(
        `UPDATE import_job
            SET status = CASE WHEN started_at IS NULL THEN 'uploaded' ELSE 'queued' END,
                status_changed_at = now(), control = NULL,
                expires_at = CASE WHEN started_at IS NULL THEN ${PgJobAdmin.expiry(
                  3
                )} END
          WHERE import_job_id = $1 AND status = ANY($2::text[])
          RETURNING ${COLUMNS}`,
        [jobId, RESUMABLE_STATUSES, this.retentionMs]
      );
      if (result.rows.length === 1) {
        return { ok: true, job: toJob(result.rows[0]) };
      }
    } catch (e) {
      const index = violatedIndex(e);
      if (index === ONE_OPEN_PER_ENTITY) {
        return { ok: false, reason: 'open_job_exists' };
      }
      if (index === ONE_IMPORT_AT_A_TIME) {
        return {
          ok: false,
          reason: 'import_running',
          entity: await this.runningEntity()
        };
      }
      throw e;
    }
    return this.refusal(jobId);
  }

  async recheck(jobId: number): Promise<Simple> {
    const result = await this.pool.query(
      `UPDATE import_job
          SET status = 'uploaded', status_changed_at = now(),
              expires_at = ${PgJobAdmin.expiry(2)}
        WHERE import_job_id = $1 AND status = 'validated'
        RETURNING ${COLUMNS}`,
      [jobId, this.retentionMs]
    );
    return result.rows.length === 1
      ? { ok: true, job: toJob(result.rows[0]) }
      : this.refusal(jobId);
  }

  async remove(jobId: number): Promise<Simple> {
    const result = await this.pool.query(
      `DELETE FROM import_job
        WHERE import_job_id = $1 AND NOT (status = ANY($2::text[]))
        RETURNING ${COLUMNS}`,
      [jobId, ACTIVE_STATUSES]
    );
    return result.rows.length === 1
      ? { ok: true, job: toJob(result.rows[0]) }
      : this.refusal(jobId);
  }

  async listOpen(): Promise<ImportJob[]> {
    const result = await this.pool.query(
      `SELECT ${COLUMNS} FROM import_job
        WHERE status = ANY($1::text[])
        ORDER BY entity, import_job_id`,
      [[...OPEN_STATUSES, ...RESUMABLE_STATUSES]]
    );
    return result.rows.map(toJob);
  }

  async issuePage(jobId: number, query: IssueQuery): Promise<IssuePage> {
    const filters = `import_job_id = $1 AND phase = $2
          AND ($3::text IS NULL OR severity = $3)
          AND ($4::text IS NULL OR code = $4)
          AND ($5::text IS NULL OR column_name = $5)`;
    const params = [
      jobId,
      query.phase,
      query.severity ?? null,
      query.code ?? null,
      query.column ?? null
    ];
    const [page, total] = await Promise.all([
      this.pool.query(
        `SELECT phase, row_number, entity_key, column_name, code, params,
                severity, message, value
           FROM import_job_issue
          WHERE ${filters}
          ORDER BY row_number NULLS FIRST, import_job_issue_id
          OFFSET $6 LIMIT $7`,
        [...params, query.offset, query.limit]
      ),
      this.pool.query(
        `SELECT count(*)::int AS n FROM import_job_issue WHERE ${filters}`,
        params
      )
    ]);
    return { items: page.rows.map(toIssue), total: total.rows[0].n };
  }
}

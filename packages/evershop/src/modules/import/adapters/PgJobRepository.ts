import type { Pool, PoolClient } from 'pg';
import {
  CLAIMS,
  FINAL,
  FINISH_FROM,
  RETENTION_MS
} from '../services/job/transitions.js';
import { emptyCounts } from '../services/job/types.js';
import type {
  ImportJob,
  IssuePhase,
  JobCounts,
  JobStage,
  JobStatus,
  StoredIssue
} from '../services/job/types.js';
import type {
  Checkpoint,
  CheckpointResult,
  FinishPatch,
  JobRepository
} from '../services/ports/jobRepository.js';
import type { ImportEntity, ImportMode } from '../services/types.js';

const COLUMNS = `import_job_id, uuid, entity, mode, status, stage, control, file_name,
  file_size, chunk_count, file_sha256, options, counts, error_message, attempt,
  worker, started_at, finished_at, heartbeat_at, expires_at`;

/**
 * Every write after the claim is conditional on this: the job still exists, it
 * is still the attempt the worker was given, and a worker still owns it. Zero
 * rows means the job was deleted, canceled, declared dead by recovery, or
 * claimed again (§ 8.4, Claim and fencing).
 */
const FENCE = `import_job_id = $1 AND attempt = $2 AND status IN ('validating','running')`;

const ISSUES_PAGE = 1000;
const MAX_VALUE_LENGTH = 200;

/** PostgreSQL text cannot hold U+0000, and a jsonb string cannot hold its escape. */
const noNul = (text: string): string => text.replace(/\u0000/g, '�');

/** JSON text for a jsonb column: without the escape for U+0000 (an even number of backslashes before it is a backslash in the text, not an escape). */
function jsonText(value: unknown): string {
  return JSON.stringify(value).replace(
    /(?<!\\)((?:\\\\)*)\\u0000/g,
    '$1\\uFFFD'
  );
}

/** The counts of a row, with a default for whatever an older or newer writer left out. */
function toCounts(raw: unknown): JobCounts {
  const base = emptyCounts();
  const stored = (raw ?? {}) as Partial<JobCounts>;
  return {
    ...base,
    ...stored,
    byCode: {
      validate: { ...stored.byCode?.validate },
      import: { ...stored.byCode?.import }
    },
    issuesTruncated: { ...base.issuesTruncated, ...stored.issuesTruncated },
    firstUnlistedRow: { ...base.firstUnlistedRow, ...stored.firstUnlistedRow }
  };
}

const time = (value: Date | null): number | null =>
  value === null ? null : value.getTime();

function toJob(row: Record<string, any>): ImportJob {
  return {
    id: row.import_job_id,
    uuid: row.uuid,
    entity: row.entity as ImportEntity,
    mode: row.mode as ImportMode,
    status: row.status as JobStatus,
    stage: row.stage as JobStage | null,
    control: row.control,
    fileName: row.file_name,
    // A bigint comes back as text.
    fileSize: Number(row.file_size),
    chunkCount: row.chunk_count,
    fileSha256: row.file_sha256,
    options: row.options ?? {},
    counts: toCounts(row.counts),
    errorMessage: row.error_message,
    attempt: row.attempt,
    worker: row.worker,
    startedAt: time(row.started_at),
    finishedAt: time(row.finished_at),
    heartbeatAt: time(row.heartbeat_at),
    expiresAt: time(row.expires_at)
  };
}

function toIssue(row: Record<string, any>): StoredIssue {
  return {
    phase: row.phase as IssuePhase,
    rowNumber: row.row_number,
    entityKey: row.entity_key,
    column: row.column_name,
    code: row.code,
    severity: row.severity,
    params: row.params ?? {},
    message: row.message,
    value: row.value
  };
}

/** One transaction on one connection; the connection is dropped if it cannot even roll back. */
async function inTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  let broken: Error | undefined;
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      broken = rollbackError as Error;
    }
    throw e;
  } finally {
    client.release(broken);
  }
}

export interface PgJobRepositoryOptions {
  /** How long a finished job is kept, by the database clock (§ 8.4, Cleanup). */
  retentionMs?: number;
}

/**
 * The jobs in PostgreSQL (§ 8.4). It takes the pool as an argument, so a test
 * can point it at a scratch database. Times are the database's `now()`, never a
 * worker's clock. Chunks, heartbeats and problems are written with bind
 * parameters, not with the typed query builder, whose `given()` would turn a
 * `Buffer` or an object into text.
 */
export class PgJobRepository implements JobRepository {
  private readonly retentionMs: number;

  constructor(
    private readonly pool: Pool,
    options: PgJobRepositoryOptions = {}
  ) {
    this.retentionMs = options.retentionMs ?? RETENTION_MS;
  }

  async get(jobId: number): Promise<ImportJob | null> {
    const result = await this.pool.query(
      `SELECT ${COLUMNS} FROM import_job WHERE import_job_id = $1`,
      [jobId]
    );
    return result.rows.length === 0 ? null : toJob(result.rows[0]);
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
    const result = await this.pool.query(
      `UPDATE import_job
          SET status = $3, attempt = attempt + 1, worker = $4,
              heartbeat_at = now(), status_changed_at = now(),
              expires_at = NULL, error_message = NULL
        WHERE import_job_id = $1 AND status = $2
        RETURNING attempt`,
      [jobId, from, to, noNul(worker)]
    );
    return result.rows.length === 0 ? null : result.rows[0].attempt;
  }

  async clearIssues(
    jobId: number,
    attempt: number,
    phase: IssuePhase
  ): Promise<boolean> {
    const result = await this.pool.query(
      `WITH job AS (
         SELECT import_job_id FROM import_job WHERE ${FENCE} FOR UPDATE
       ), cleared AS (
         DELETE FROM import_job_issue
          WHERE import_job_id IN (SELECT import_job_id FROM job) AND phase = $3
       )
       SELECT count(*)::int AS fenced FROM job`,
      [jobId, attempt, phase]
    );
    return result.rows[0].fenced === 1;
  }

  async checkpoint(
    jobId: number,
    attempt: number,
    checkpoint: Checkpoint
  ): Promise<CheckpointResult> {
    return inTransaction(this.pool, async (client) => {
      const params: unknown[] = [jobId, attempt, jsonText(checkpoint.counts)];
      let stage = '';
      if (checkpoint.stage !== undefined) {
        params.push(checkpoint.stage);
        stage = `, stage = $${params.length}`;
      }
      const updated = await client.query(
        `UPDATE import_job
            SET counts = $3::jsonb${stage}, heartbeat_at = now()
          WHERE ${FENCE}
          RETURNING control`,
        params
      );
      if (updated.rows.length === 0) {
        return { ok: false } as const;
      }
      if (checkpoint.issues.length > 0) {
        // The row lock the update took keeps the fence true until the commit.
        await client.query(
          `INSERT INTO import_job_issue
             (import_job_id, phase, row_number, entity_key, column_name, code,
              params, severity, message, value)
           SELECT $1, x.phase, x.row_number, x.entity_key, x.column_name, x.code,
                  x.params, x.severity, x.message, x.value
             FROM jsonb_to_recordset($2::jsonb) AS x(
                    n int, phase text, row_number int, entity_key text,
                    column_name text, code text, params jsonb, severity text,
                    message text, value text)
            ORDER BY x.n`,
          [
            jobId,
            jsonText(
              checkpoint.issues.map((issue, n) => ({
                n,
                phase: issue.phase,
                row_number: issue.rowNumber,
                entity_key: issue.entityKey,
                column_name: issue.column,
                code: issue.code,
                params: issue.params,
                severity: issue.severity,
                message: issue.message,
                value:
                  issue.value === null
                    ? null
                    : issue.value.slice(0, MAX_VALUE_LENGTH)
              }))
            )
          ]
        );
      }
      return { ok: true, control: updated.rows[0].control } as const;
    });
  }

  async markStarted(jobId: number, attempt: number): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE import_job SET started_at = COALESCE(started_at, now()) WHERE ${FENCE}`,
      [jobId, attempt]
    );
    return result.rowCount === 1;
  }

  async errorRows(jobId: number, phase: IssuePhase): Promise<Set<number>> {
    const result = await this.pool.query(
      `SELECT DISTINCT row_number FROM import_job_issue
        WHERE import_job_id = $1 AND phase = $2 AND severity = 'error'
          AND row_number IS NOT NULL`,
      [jobId, phase]
    );
    return new Set(result.rows.map((row) => row.row_number as number));
  }

  /**
   * In pages of `ISSUES_PAGE`, by key, so a job with 100,000 problems is never
   * held in memory and no cursor stays open: the problems with no row first
   * (by id), then by row and id.
   */
  async *issuesInRowOrder(
    jobId: number,
    phase: IssuePhase
  ): AsyncGenerator<StoredIssue, void, undefined> {
    const select = `SELECT import_job_issue_id, phase, row_number, entity_key,
                           column_name, code, params, severity, message, value
                      FROM import_job_issue`;
    let afterId = 0;
    for (;;) {
      const page = await this.pool.query(
        `${select}
          WHERE import_job_id = $1 AND phase = $2 AND row_number IS NULL
            AND import_job_issue_id > $3
          ORDER BY import_job_issue_id LIMIT ${ISSUES_PAGE}`,
        [jobId, phase, afterId]
      );
      for (const row of page.rows) yield toIssue(row);
      if (page.rows.length < ISSUES_PAGE) break;
      afterId = page.rows[page.rows.length - 1].import_job_issue_id;
    }
    let afterRow = 0;
    afterId = 0;
    for (;;) {
      const page = await this.pool.query(
        `${select}
          WHERE import_job_id = $1 AND phase = $2 AND row_number IS NOT NULL
            AND (row_number, import_job_issue_id) > ($3, $4)
          ORDER BY row_number, import_job_issue_id LIMIT ${ISSUES_PAGE}`,
        [jobId, phase, afterRow, afterId]
      );
      for (const row of page.rows) yield toIssue(row);
      if (page.rows.length < ISSUES_PAGE) break;
      const last = page.rows[page.rows.length - 1];
      afterRow = last.row_number;
      afterId = last.import_job_issue_id;
    }
  }

  async finish(
    jobId: number,
    attempt: number,
    to: JobStatus,
    patch: FinishPatch = {}
  ): Promise<boolean> {
    const from = Object.keys(FINISH_FROM).filter((status) =>
      FINISH_FROM[status].includes(to)
    );
    const params: unknown[] = [jobId, attempt, to, this.retentionMs, from];
    const set = [
      'status = $3',
      'stage = NULL',
      'control = NULL',
      'heartbeat_at = now()',
      'status_changed_at = now()',
      `expires_at = now() + ($4 * interval '1 millisecond')`
    ];
    if (patch.errorMessage !== undefined) {
      params.push(
        patch.errorMessage === null ? null : noNul(patch.errorMessage)
      );
      set.push(`error_message = $${params.length}`);
    }
    if (patch.counts) {
      params.push(jsonText(patch.counts));
      set.push(`counts = $${params.length}::jsonb`);
    }
    if (FINAL.has(to)) set.push('finished_at = now()');
    if (to === 'validated') set.push('validated_at = now()');
    // A job that has written something cannot go back to validated.
    const neverWrote =
      to === 'validated'
        ? `AND NOT (status = 'running' AND started_at IS NOT NULL)`
        : '';
    const result = await this.pool.query(
      `UPDATE import_job SET ${set.join(', ')}
        WHERE ${FENCE} AND status = ANY($5::text[]) ${neverWrote}`,
      params
    );
    if (result.rowCount === 1) {
      return true;
    }
    // Nothing changed: either the worker is stale, which is a normal end for it,
    // or it asked for a change that is not allowed, which is a bug.
    const current = await this.pool.query(
      `SELECT status, started_at FROM import_job
        WHERE import_job_id = $1 AND attempt = $2 AND status IN ('validating','running')`,
      [jobId, attempt]
    );
    if (current.rows.length === 0) {
      return false;
    }
    const { status, started_at: startedAt } = current.rows[0];
    if (to === 'validated' && status === 'running' && startedAt !== null) {
      throw new Error(
        'A job that has written something cannot go back to validated'
      );
    }
    throw new Error(`A worker cannot take a job from ${status} to ${to}`);
  }
}

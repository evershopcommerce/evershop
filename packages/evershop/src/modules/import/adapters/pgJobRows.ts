import type { Pool, PoolClient } from 'pg';
import { emptyCounts } from '../services/job/types.js';
import type {
  ImportJob,
  IssuePhase,
  JobCounts,
  JobStage,
  JobStatus,
  StoredIssue
} from '../services/job/types.js';
import type { ImportEntity, ImportMode } from '../services/types.js';

/**
 * What the PostgreSQL adapters of the jobs share: the columns of a job, how a
 * row becomes a job or a problem, and the rules for the text and the JSON that
 * go into the tables.
 */

export const COLUMNS = `import_job_id, uuid, entity, mode, status, stage, control, file_name,
  file_size, chunk_count, file_sha256, options, counts, error_message, attempt,
  worker, started_at, finished_at, heartbeat_at, expires_at, created_at,
  status_changed_at, validated_at, waiting_since, created_by`;

export const ISSUES_PAGE = 1000;
export const MAX_VALUE_LENGTH = 200;

/** PostgreSQL text cannot hold U+0000, and a jsonb string cannot hold its escape. */
export const noNul = (text: string): string => text.replace(/\u0000/g, '�');

/** JSON text for a jsonb column: without the escape for U+0000 (an even number of backslashes before it is a backslash in the text, not an escape). */
export function jsonText(value: unknown): string {
  return JSON.stringify(value).replace(
    /(?<!\\)((?:\\\\)*)\\u0000/g,
    '$1\\uFFFD'
  );
}

/** The counts of a row, with a default for whatever an older or newer writer left out. */
export function toCounts(raw: unknown): JobCounts {
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

export function toJob(row: Record<string, any>): ImportJob {
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
    expiresAt: time(row.expires_at),
    createdAt: (row.created_at as Date).getTime(),
    statusChangedAt: (row.status_changed_at as Date).getTime(),
    validatedAt: time(row.validated_at),
    waitingSince: time(row.waiting_since),
    createdBy: row.created_by
  };
}

export function toIssue(row: Record<string, any>): StoredIssue {
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
export async function inTransaction<T>(
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

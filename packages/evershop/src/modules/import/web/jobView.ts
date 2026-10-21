import type { ImportJob, StoredIssue } from '../services/job/types.js';

const iso = (ms: number | null): string | null =>
  ms === null ? null : new Date(ms).toISOString();

/**
 * A job as the API shows it. The uuid is its name in every URL; the numeric id,
 * the fencing token, the worker and the hash of the file stay inside.
 */
export function jobView(
  job: ImportJob,
  names: Map<number, string>,
  /** Says the message of the job in the admin's language (English without it). */
  say: (message: string | null) => string | null = (message) => message
) {
  return {
    uuid: job.uuid,
    entity: job.entity,
    mode: job.mode,
    status: job.status,
    stage: job.stage,
    cancelRequested: job.control === 'cancel',
    fileName: job.fileName,
    fileSize: job.fileSize,
    // False when the file is not kept (a newer upload took its place, or it had
    // nothing to give back): there is no file with errors to download then.
    fileKept: job.chunkCount !== null,
    options: job.options,
    counts: job.counts,
    errorMessage: say(job.errorMessage),
    createdAt: iso(job.createdAt),
    statusChangedAt: iso(job.statusChangedAt),
    validatedAt: iso(job.validatedAt),
    startedAt: iso(job.startedAt),
    finishedAt: iso(job.finishedAt),
    expiresAt: iso(job.expiresAt),
    // When the worker began to wait for the event queue to drain (§ 8.5).
    waitingSince: iso(job.waitingSince),
    createdBy:
      job.createdBy === null
        ? null
        : { id: job.createdBy, name: names.get(job.createdBy) ?? null }
  };
}

/** A problem as the API shows it: the row, the key, the column, the code, the message and the cell. */
export function issueView(issue: StoredIssue) {
  return {
    row: issue.rowNumber,
    key: issue.entityKey,
    column: issue.column,
    code: issue.code,
    severity: issue.severity,
    params: issue.params,
    message: issue.message,
    value: issue.value
  };
}

/** What `GET /import-jobs/:id` answers (the data, as the page reads it: dates are ISO text). */
export type JobView = ReturnType<typeof jobView>;

/** One problem of `GET /import-jobs/:id/issues`. */
export type IssueView = ReturnType<typeof issueView>;

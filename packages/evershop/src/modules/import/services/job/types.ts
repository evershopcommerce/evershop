import type { ImportEntity, ImportMode } from '../types.js';

/** The statuses of a job (§ 8.4). `failed`, `completed` and `canceled` are final. */
export type JobStatus =
  | 'uploading'
  | 'uploaded'
  | 'validating'
  | 'validated'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'stopped'
  | 'canceled'
  | 'interrupted';

/** What the worker is doing now. */
export type JobStage =
  | 'reading'
  | 'rechecking'
  | 'lookups'
  | 'images'
  | 'writing';

/** The phase of a problem: the check, or the import. */
export type IssuePhase = 'validate' | 'import';

/**
 * The counts of a job (§ 8.4), rewritten by the heartbeat. `total`, `createRows`
 * and `updateRows` are known only when the check has read the whole file.
 */
export interface JobCounts {
  total: number;
  bytesRead: number;
  errors: number;
  warnings: number;
  createRows: number;
  updateRows: number;
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  /** The number of units completed in plan order (§ 4.3), whole units only. */
  lastUnit: number;
  /** The totals per code, also above the cap on stored problems. */
  byCode: Record<IssuePhase, Record<string, number>>;
  issuesTruncated: Record<IssuePhase, boolean>;
  /**
   * When the problems of a phase were cut at the cap: the lowest row number of
   * a problem that was not stored. From this row on, a row may have problems
   * that are not listed (the file with errors says so). Null when nothing was
   * cut, or when only problems of the file as a whole were.
   */
  firstUnlistedRow: Record<IssuePhase, number | null>;
}

export function emptyCounts(): JobCounts {
  return {
    total: 0,
    bytesRead: 0,
    errors: 0,
    warnings: 0,
    createRows: 0,
    updateRows: 0,
    created: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    lastUnit: 0,
    byCode: { validate: {}, import: {} },
    issuesTruncated: { validate: false, import: false },
    firstUnlistedRow: { validate: null, import: null }
  };
}

export function cloneCounts(counts: JobCounts): JobCounts {
  return {
    ...counts,
    byCode: {
      validate: { ...counts.byCode.validate },
      import: { ...counts.byCode.import }
    },
    issuesTruncated: { ...counts.issuesTruncated },
    firstUnlistedRow: { ...counts.firstUnlistedRow }
  };
}

/** The job as the worker needs to see it. */
export interface ImportJob {
  id: number;
  uuid: string;
  entity: ImportEntity;
  mode: ImportMode;
  status: JobStatus;
  stage: JobStage | null;
  /** `cancel`, written by the API and read by the worker (§ 8.4, Control). */
  control: 'cancel' | null;
  fileName: string;
  fileSize: number;
  chunkCount: number | null;
  fileSha256: string | null;
  options: { checkImages?: boolean };
  counts: JobCounts;
  /** Why the job failed, stopped, was interrupted or went back to `validated`. */
  errorMessage: string | null;
  /** The fencing token: +1 at every claim. */
  attempt: number;
  worker: string | null;
  /** The first time a worker began to WRITE; never cleared. */
  startedAt: number | null;
  finishedAt: number | null;
  heartbeatAt: number | null;
  expiresAt: number | null;
}

/** A problem as it is stored (the table `import_job_issue`). */
export interface StoredIssue {
  phase: IssuePhase;
  rowNumber: number | null;
  entityKey: string | null;
  column: string | null;
  code: string;
  severity: 'error' | 'warning';
  params: Record<string, unknown>;
  message: string;
  value: string | null;
}

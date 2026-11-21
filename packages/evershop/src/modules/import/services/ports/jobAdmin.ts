import type {
  ImportJob,
  IssuePhase,
  JobStatus,
  StoredIssue
} from '../job/types.js';
import type { ImportEntity, ImportMode } from '../types.js';

/** What the upload page sends before the file (§ 8.3). */
export interface NewUpload {
  entity: ImportEntity;
  mode: ImportMode;
  options: ImportJob['options'];
  fileName: string;
  createdBy: number | null;
}

/** The size, the number of chunks and the SHA-256 of the file as it arrived. */
export interface UploadedFile {
  size: number;
  chunkCount: number;
  sha256: string;
}

export type NotFound = { ok: false; reason: 'not_found' };
export type WrongStatus = {
  ok: false;
  reason: 'wrong_status';
  status: JobStatus;
};
/** Another import is queued or running (D-11): only one runs at a time. */
export type ImportRunning = {
  ok: false;
  reason: 'import_running';
  entity: ImportEntity;
};

export type Done = { ok: true; job: ImportJob };

export type UploadResult =
  | (Done & { replaced: boolean })
  /** The entity's import is busy: the upload is refused and its job deleted. */
  | { ok: false; reason: 'import_running' }
  /** The job is gone (the cleanup deleted a half-uploaded file). */
  | { ok: false; reason: 'gone' };

export type StartResult =
  | Done
  | NotFound
  | WrongStatus
  | { ok: false; reason: 'file_has_errors' }
  | ImportRunning;

export type ResumeResult =
  | Done
  | NotFound
  | WrongStatus
  | { ok: false; reason: 'open_job_exists' }
  | ImportRunning;

export type CancelResult =
  /** `canceled`: a job nobody had claimed. `requested`: a worker will stop between two rows. */
  (Done & { how: 'canceled' | 'requested' }) | NotFound | WrongStatus;

export type Simple = Done | NotFound | WrongStatus;

export interface IssueQuery {
  phase: IssuePhase;
  severity?: 'error' | 'warning';
  code?: string;
  column?: string;
  offset: number;
  limit: number;
}

export interface IssuePage {
  items: StoredIssue[];
  /** All the problems that match, not only this page. */
  total: number;
}

/**
 * The jobs, as the API sees them (§ 4.5, point 2; § 8.3, 8.4): the upload and
 * its swap, and the actions of the admin. Every action is a compare-and-swap on
 * the status the action allows, so two admins, or an admin and a worker, never
 * both win; a refusal says why instead of throwing. The worker's side is
 * `JobRepository`.
 *
 * The real one is `PgJobAdmin`; the test double is `MemoryJobStore`.
 */
export interface JobAdmin {
  get(jobId: number): Promise<ImportJob | null>;

  /** The job by the uuid the API gives it; null when there is none. */
  getByUuid(uuid: string): Promise<ImportJob | null>;

  /** True when the entity's import is busy: running, or queued after it wrote something. */
  entityBusy(entity: ImportEntity): Promise<boolean>;

  /** Inserts the job as `uploading`. It blocks nothing and nothing reads it. */
  beginUpload(upload: NewUpload): Promise<ImportJob>;

  /**
   * Stores chunk `seq` of the file and shows the upload is alive (the heartbeat).
   * False when the job is no longer `uploading`: the upload stops.
   */
  addChunk(jobId: number, seq: number, data: Uint8Array): Promise<boolean>;

  /**
   * The swap, one short transaction (§ 8.4): it locks the entity's jobs; when one
   * is busy the upload is refused; otherwise the entity's unstarted jobs are
   * deleted, a stopped or interrupted job that wrote something is closed as
   * `canceled` and its file deleted, the kept files of its finished jobs are
   * deleted, and this job gets its size, chunk count and SHA-256 and becomes
   * `uploaded`.
   */
  completeUpload(jobId: number, file: UploadedFile): Promise<UploadResult>;

  /** Deletes a job that is still `uploading`, with its chunks. */
  abortUpload(jobId: number): Promise<void>;

  /** `validated` → `queued`, when the check found no errors (D-17). */
  start(jobId: number): Promise<StartResult>;

  /**
   * A `queued` job nobody has claimed becomes `canceled` at once; a `validating`
   * or `running` job gets `control = 'cancel'`, which the worker reads between
   * two rows.
   */
  cancel(jobId: number): Promise<CancelResult>;

  /** `stopped` or `interrupted` → `queued`, or `uploaded` when it never wrote. */
  resume(jobId: number): Promise<ResumeResult>;

  /** Check again (D-33): `validated` → `uploaded`. */
  recheck(jobId: number): Promise<Simple>;

  /** Deletes a job that is not active, with its chunks and problems. */
  remove(jobId: number): Promise<Simple>;

  /** The open jobs and the resumable ones, for the upload page's notices. */
  listOpen(): Promise<ImportJob[]>;

  /** The problems of a phase, in the order of the rows, one page of them. */
  issuePage(jobId: number, query: IssueQuery): Promise<IssuePage>;
}

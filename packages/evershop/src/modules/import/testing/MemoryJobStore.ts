import {
  ACTIVE_STATUSES,
  OPEN_STATUSES,
  RESUMABLE_STATUSES
} from '../services/job/types.js';
import type { ImportJob, StoredIssue } from '../services/job/types.js';
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
import { MemoryJobRepository } from './MemoryJobRepository.js';

const isBusy = (job: ImportJob): boolean =>
  job.status === 'running' ||
  (job.status === 'queued' && job.startedAt !== null);

const isOpen = (job: ImportJob): boolean => OPEN_STATUSES.includes(job.status);

const isRunningSlot = (job: ImportJob): boolean =>
  job.status === 'queued' || job.status === 'running';

/**
 * TEST-ONLY. The jobs as the API sees them, on top of the worker's side
 * (`MemoryJobRepository`), with the two unique indexes of the table: at most one
 * open job per entity, and at most one import queued or running. The same
 * contract suite runs against `PgJobAdmin`.
 */
export class MemoryJobStore extends MemoryJobRepository implements JobAdmin {
  /** The chunks of each job's file, by `seq`. */
  protected readonly chunks = new Map<number, Buffer[]>();

  // ---- for a test to look at -------------------------------------------

  /** The chunks stored for a job. */
  chunksOf(jobId: number): Buffer[] {
    return [...(this.chunks.get(jobId) ?? [])];
  }

  /** Puts chunks of a file on a job, as an upload that finished long ago did. */
  seedChunks(jobId: number, chunks: Buffer[]): void {
    this.chunks.set(
      jobId,
      chunks.map((chunk) => Buffer.from(chunk))
    );
  }

  /** The job is deleted while something runs; its chunks go with it. */
  delete(jobId: number): void {
    super.delete(jobId);
    this.chunks.delete(jobId);
  }

  // ---- the port --------------------------------------------------------

  async getByUuid(uuid: string): Promise<ImportJob | null> {
    const job = [...this.jobs.values()].find((one) => one.uuid === uuid);
    return job ? this.snapshot(job.id) : null;
  }

  async entityBusy(entity: ImportEntity): Promise<boolean> {
    return [...this.jobs.values()].some(
      (job) => job.entity === entity && isBusy(job)
    );
  }

  async beginUpload(upload: NewUpload): Promise<ImportJob> {
    const job = this.insert({
      status: 'uploading',
      entity: upload.entity,
      mode: upload.mode,
      options: upload.options,
      fileName: upload.fileName,
      createdBy: upload.createdBy
    });
    return this.snapshot(job.id);
  }

  async addChunk(
    jobId: number,
    seq: number,
    data: Uint8Array
  ): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'uploading') {
      return false;
    }
    const chunks = this.chunks.get(jobId) ?? [];
    if (chunks[seq] !== undefined) {
      throw new Error('IMPORT_JOB_FILE_SEQ_UNIQUE');
    }
    chunks[seq] = Buffer.from(data);
    this.chunks.set(jobId, chunks);
    job.heartbeatAt = this.clock.now();
    return true;
  }

  async completeUpload(
    jobId: number,
    file: UploadedFile
  ): Promise<UploadResult> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'uploading') {
      return { ok: false, reason: 'gone' };
    }
    const others = [...this.jobs.values()].filter(
      (other) => other.entity === job.entity && other.id !== jobId
    );
    if (others.some(isBusy)) {
      return { ok: false, reason: 'import_running' };
    }
    let replaced = false;
    for (const other of others) {
      const resumable = RESUMABLE_STATUSES.includes(other.status);
      if (
        (isOpen(other) && !isBusy(other)) ||
        (resumable && other.startedAt === null)
      ) {
        super.delete(other.id);
        this.chunks.delete(other.id);
        replaced = true;
      } else if (resumable) {
        // It wrote something: it is closed, not deleted, and its file goes.
        const now = this.clock.now();
        other.status = 'canceled';
        other.statusChangedAt = now;
        other.finishedAt = now;
        other.expiresAt = now + this.retentionMs;
        other.stage = null;
        other.control = null;
        this.chunks.delete(other.id);
        replaced = true;
      } else if (
        other.status === 'completed' ||
        other.status === 'failed' ||
        other.status === 'canceled'
      ) {
        // The file a finished job kept for its download with errors.
        this.chunks.delete(other.id);
      }
    }
    const now = this.clock.now();
    job.status = 'uploaded';
    job.statusChangedAt = now;
    job.fileSize = file.size;
    job.chunkCount = file.chunkCount;
    job.fileSha256 = file.sha256;
    job.heartbeatAt = now;
    job.expiresAt = now + this.retentionMs;
    return { ok: true, job: this.snapshot(jobId), replaced };
  }

  async abortUpload(jobId: number): Promise<void> {
    if (this.jobs.get(jobId)?.status === 'uploading') {
      this.delete(jobId);
    }
  }

  /** The job that has a slot of the "one import at a time" index, if any. */
  private runningSlot(exceptId: number): ImportJob | undefined {
    return [...this.jobs.values()].find(
      (job) => job.id !== exceptId && isRunningSlot(job)
    );
  }

  async start(jobId: number): Promise<StartResult> {
    const job = this.jobs.get(jobId);
    if (!job) return { ok: false, reason: 'not_found' };
    if (job.status !== 'validated') {
      return { ok: false, reason: 'wrong_status', status: job.status };
    }
    if (job.counts.errors > 0) {
      return { ok: false, reason: 'file_has_errors' };
    }
    const other = this.runningSlot(jobId);
    if (other) {
      return { ok: false, reason: 'import_running', entity: other.entity };
    }
    job.status = 'queued';
    job.statusChangedAt = this.clock.now();
    job.expiresAt = null;
    job.errorMessage = null;
    job.control = null;
    return { ok: true, job: this.snapshot(jobId) };
  }

  async cancel(jobId: number): Promise<CancelResult> {
    const job = this.jobs.get(jobId);
    if (!job) return { ok: false, reason: 'not_found' };
    if (job.status === 'queued') {
      const now = this.clock.now();
      job.status = 'canceled';
      job.statusChangedAt = now;
      job.finishedAt = now;
      job.expiresAt = now + this.retentionMs;
      job.stage = null;
      job.control = null;
      return { ok: true, how: 'canceled', job: this.snapshot(jobId) };
    }
    if (job.status === 'validating' || job.status === 'running') {
      job.control = 'cancel';
      return { ok: true, how: 'requested', job: this.snapshot(jobId) };
    }
    return { ok: false, reason: 'wrong_status', status: job.status };
  }

  async resume(jobId: number): Promise<ResumeResult> {
    const job = this.jobs.get(jobId);
    if (!job) return { ok: false, reason: 'not_found' };
    if (!RESUMABLE_STATUSES.includes(job.status)) {
      return { ok: false, reason: 'wrong_status', status: job.status };
    }
    const target = job.startedAt === null ? 'uploaded' : 'queued';
    const sameEntity = [...this.jobs.values()].some(
      (other) =>
        other.id !== jobId && other.entity === job.entity && isOpen(other)
    );
    if (sameEntity) {
      return { ok: false, reason: 'open_job_exists' };
    }
    if (target === 'queued') {
      const other = this.runningSlot(jobId);
      if (other) {
        return { ok: false, reason: 'import_running', entity: other.entity };
      }
    }
    job.status = target;
    job.statusChangedAt = this.clock.now();
    job.control = null;
    job.expiresAt =
      target === 'uploaded' ? this.clock.now() + this.retentionMs : null;
    return { ok: true, job: this.snapshot(jobId) };
  }

  async recheck(jobId: number): Promise<Simple> {
    const job = this.jobs.get(jobId);
    if (!job) return { ok: false, reason: 'not_found' };
    if (job.status !== 'validated') {
      return { ok: false, reason: 'wrong_status', status: job.status };
    }
    job.status = 'uploaded';
    job.statusChangedAt = this.clock.now();
    job.expiresAt = this.clock.now() + this.retentionMs;
    return { ok: true, job: this.snapshot(jobId) };
  }

  async remove(jobId: number): Promise<Simple> {
    const job = this.jobs.get(jobId);
    if (!job) return { ok: false, reason: 'not_found' };
    if (ACTIVE_STATUSES.includes(job.status)) {
      return { ok: false, reason: 'wrong_status', status: job.status };
    }
    const last = this.snapshot(jobId);
    this.delete(jobId);
    return { ok: true, job: last };
  }

  async listOpen(): Promise<ImportJob[]> {
    return [...this.jobs.values()]
      .filter((job) => isOpen(job) || RESUMABLE_STATUSES.includes(job.status))
      .sort((a, b) => a.entity.localeCompare(b.entity) || a.id - b.id)
      .map((job) => this.snapshot(job.id));
  }

  async issuePage(jobId: number, query: IssueQuery): Promise<IssuePage> {
    const matching: StoredIssue[] = this.rows
      .filter(
        (row) =>
          row.jobId === jobId &&
          row.phase === query.phase &&
          (query.severity === undefined || row.severity === query.severity) &&
          (query.code === undefined || row.code === query.code) &&
          (query.column === undefined || row.column === query.column)
      )
      // The sort is stable: inside a row the problems stay in the order found.
      .sort((a, b) => (a.rowNumber ?? 0) - (b.rowNumber ?? 0))
      .map(({ jobId: _job, ...issue }) => issue);
    return {
      total: matching.length,
      items: matching.slice(query.offset, query.offset + query.limit)
    };
  }
}

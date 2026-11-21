import type { ImportJob, IssuePhase, StoredIssue } from '../job/types.js';
import { isJobUuid } from '../job/uuid.js';
import type { Sha256 } from '../ports/hasher.js';
import type { JobAdmin, UploadedFile } from '../ports/jobAdmin.js';
import type { JobRequests } from '../ports/jobRequests.js';
import type { RenderMessage } from '../report/errorsCell.js';
import { IMPORT_ENTITIES } from '../types.js';
import type { ImportEntity, ImportMode } from '../types.js';
import { ImportApiError } from './errors.js';
import { limitBytes, rechunk } from './rechunk.js';

/** The size of a stored chunk (§ 8.4): the table refuses more. */
export const CHUNK_BYTES = 1_048_576;

const MODES: readonly ImportMode[] = ['upsert', 'create', 'update'];
const MAX_FILE_NAME = 200;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export interface ImportServiceDeps {
  jobs: JobAdmin;
  sha256: Sha256;
  /** The most bytes an upload may have (`maxFileSizeMb`, § 8.7). */
  maxFileBytes: number;
  /** The sentence for a problem in the admin's language; the stored English one without it. */
  render?: RenderMessage;
  /** For a test that wants small chunks. */
  chunkBytes?: number;
  /**
   * Asked for a worker whenever a job starts waiting for one (`uploaded` or
   * `queued`). Without it nothing starts a worker: the dispatch cron does.
   */
  requests?: Pick<JobRequests, 'request'>;
}

export interface UploadArgs {
  entity: unknown;
  mode?: unknown;
  checkImages?: unknown;
  fileName: unknown;
  createdBy: number | null;
  /** The file as it arrives. Nothing is parsed. */
  file: AsyncIterable<Uint8Array | string>;
}

/** An upload whose file has arrived whole but whose swap has not been made (`receive`). */
export interface ReceivedUpload {
  /** The new job, still `uploading`. */
  job: ImportJob;
  entity: ImportEntity;
  file: UploadedFile;
}

export interface IssuesArgs {
  phase?: unknown;
  severity?: unknown;
  code?: unknown;
  column?: unknown;
  page?: unknown;
  limit?: unknown;
}

export interface IssuesView {
  job: ImportJob;
  phase: IssuePhase;
  page: number;
  limit: number;
  /** All the problems that match the filters. */
  total: number;
  items: StoredIssue[];
  /** The totals per code of the phase: complete also above the cap on stored problems. */
  byCode: Record<string, number>;
  /** More problems exist than are listed. */
  truncated: boolean;
}

const invalid = (message: string, details: Record<string, unknown> = {}) =>
  new ImportApiError('INVALID_REQUEST', message, details);

const noSuchJob = () => new ImportApiError('NOT_FOUND', 'No such import job.');

/** The name the admin's browser sent, as a name that is safe to show and to keep. */
export function cleanFileName(value: unknown): string {
  const text = typeof value === 'string' ? value : '';
  // Only the last part of a path; control characters and U+0000 are not kept.
  const base = text.split(/[\\/]/).pop() ?? '';
  const name = base.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').trim();
  return (name || 'upload.csv').slice(0, MAX_FILE_NAME);
}

function parseEntity(value: unknown): ImportEntity {
  if (typeof value === 'string' && Object.hasOwn(IMPORT_ENTITIES, value)) {
    return value as ImportEntity;
  }
  throw invalid(
    `"entity" must be one of: ${Object.keys(IMPORT_ENTITIES).join(', ')}.`
  );
}

function parseMode(value: unknown): ImportMode {
  if (value === undefined || value === null || value === '') {
    return 'upsert';
  }
  if (
    typeof value === 'string' &&
    (MODES as readonly string[]).includes(value)
  ) {
    return value as ImportMode;
  }
  throw invalid(`"mode" must be one of: ${MODES.join(', ')}.`);
}

function parseFlag(value: unknown, name: string): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (value === true || value === 'true' || value === '1' || value === 1) {
    return true;
  }
  if (value === false || value === 'false' || value === '0' || value === 0) {
    return false;
  }
  throw invalid(`"${name}" must be true or false.`);
}

function parseWhole(
  value: unknown,
  name: string,
  fallback: number,
  min: number,
  max: number
): number {
  if (value === undefined || value === null || value === '') return fallback;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw invalid(`"${name}" must be a whole number from ${min} to ${max}.`);
  }
  return number;
}

function parseOptional(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw invalid(`"${name}" must be a text.`);
  }
  return value;
}

/**
 * The actions on import jobs (§ 8.3), over ports only: the upload and its swap,
 * Start, Cancel, Resume, Check again, Delete, and the problems of a job. It
 * checks the request and says no with an `ImportApiError`; the REST handlers
 * (not built yet) only parse the request, call it and send the answer.
 */
export class ImportService {
  private readonly chunkBytes: number;

  constructor(private readonly deps: ImportServiceDeps) {
    this.chunkBytes = deps.chunkBytes ?? CHUNK_BYTES;
  }

  /**
   * Streams the file into the job's chunks, then swaps (D-11): the entity's
   * unstarted jobs are deleted only now, when the new file has arrived whole, so
   * an upload that fails or is dropped costs the admin nothing. Does no parsing.
   */
  async upload(
    args: UploadArgs
  ): Promise<{ job: ImportJob; replaced: boolean }> {
    const received = await this.receive(args);
    try {
      return await this.finalize(received);
    } catch (e) {
      // A job that is not `uploading` any more is left alone.
      await this.discard(received);
      throw e;
    }
  }

  /**
   * The first half of an upload: the file goes into the chunks of a new job that
   * is still `uploading`. Nothing of the entity is changed yet, so a caller that
   * has more to check in the request (the multipart parser) can still refuse it
   * and `discard` the job at no cost. `finalize` does the swap.
   */
  async receive(args: UploadArgs): Promise<ReceivedUpload> {
    const { jobs, sha256, maxFileBytes } = this.deps;
    const entity = parseEntity(args.entity);
    const mode = parseMode(args.mode);
    const checkImages = parseFlag(args.checkImages, 'checkImages');
    const fileName = cleanFileName(args.fileName);

    // Nobody should send 100 MB for nothing.
    if (await jobs.entityBusy(entity)) {
      throw this.busy(entity);
    }
    const job = await jobs.beginUpload({
      entity,
      mode,
      options: { checkImages },
      fileName,
      createdBy: args.createdBy
    });
    try {
      const hash = sha256();
      let size = 0;
      let seq = 0;
      const pieces = limitBytes(
        args.file,
        maxFileBytes,
        () =>
          new ImportApiError(
            'FILE_TOO_LARGE',
            `The file is larger than ${Math.floor(
              maxFileBytes / 1_048_576
            )} MB.`,
            { maxFileBytes }
          )
      );
      for await (const chunk of rechunk(pieces, this.chunkBytes)) {
        hash.update(chunk);
        size += chunk.length;
        if (!(await jobs.addChunk(job.id, seq, chunk))) {
          throw new ImportApiError(
            'NOT_FOUND',
            'The upload was removed before it finished.'
          );
        }
        seq += 1;
      }
      return {
        job,
        entity,
        file: { size, chunkCount: seq, sha256: hash.digestHex() }
      };
    } catch (e) {
      await jobs.abortUpload(job.id).catch(() => undefined);
      throw e;
    }
  }

  /**
   * The second half: the swap (the entity's unstarted jobs go, a stopped one that
   * wrote something is closed), the job becomes `uploaded`, and the worker is
   * asked to check it.
   */
  async finalize(
    received: ReceivedUpload
  ): Promise<{ job: ImportJob; replaced: boolean }> {
    const done = await this.deps.jobs.completeUpload(
      received.job.id,
      received.file
    );
    if (!done.ok) {
      throw done.reason === 'import_running'
        ? this.busy(received.entity)
        : new ImportApiError(
            'NOT_FOUND',
            'The upload was removed before it finished.'
          );
    }
    await this.requestWorker(done.job);
    return { job: done.job, replaced: done.replaced };
  }

  /** Throws away a received upload that was not finalized. A job that is not `uploading` is left alone. */
  async discard(received: ReceivedUpload): Promise<void> {
    await this.deps.jobs.abortUpload(received.job.id).catch(() => undefined);
  }

  async get(jobId: number): Promise<ImportJob> {
    const job = await this.deps.jobs.get(jobId);
    if (!job) throw noSuchJob();
    return job;
  }

  /** The job by the uuid the API gives it; a text that is not a uuid is a job that is not there. */
  async byUuid(uuid: unknown): Promise<ImportJob> {
    if (!isJobUuid(uuid)) throw noSuchJob();
    const job = await this.deps.jobs.getByUuid(uuid.toLowerCase());
    if (!job) throw noSuchJob();
    return job;
  }

  async issues(jobId: number, args: IssuesArgs = {}): Promise<IssuesView> {
    const job = await this.get(jobId);
    // Before the import the table is the check's; after it, the import's.
    const phase = this.parsePhase(args.phase, job);
    const severity = parseOptional(args.severity, 'severity');
    if (
      severity !== undefined &&
      severity !== 'error' &&
      severity !== 'warning'
    ) {
      throw invalid('"severity" must be error or warning.');
    }
    const page = parseWhole(args.page, 'page', 1, 1, 1_000_000);
    const limit = parseWhole(
      args.limit,
      'limit',
      DEFAULT_PAGE_SIZE,
      1,
      MAX_PAGE_SIZE
    );
    const result = await this.deps.jobs.issuePage(jobId, {
      phase,
      severity,
      code: parseOptional(args.code, 'code'),
      column: parseOptional(args.column, 'column'),
      offset: (page - 1) * limit,
      limit
    });
    const { render } = this.deps;
    return {
      job,
      phase,
      page,
      limit,
      total: result.total,
      items: render
        ? result.items.map((issue) => ({ ...issue, message: render(issue) }))
        : result.items,
      byCode: job.counts.byCode[phase],
      truncated: job.counts.issuesTruncated[phase]
    };
  }

  async start(jobId: number): Promise<ImportJob> {
    const result = await this.deps.jobs.start(jobId);
    if (result.ok) {
      await this.requestWorker(result.job);
      return result.job;
    }
    switch (result.reason) {
      case 'file_has_errors':
        throw new ImportApiError(
          'FILE_HAS_ERRORS',
          'The check found errors. Fix the file and upload it again.'
        );
      case 'import_running':
        throw this.alreadyRunning(result.entity);
      default:
        throw this.refusal(result);
    }
  }

  async cancel(
    jobId: number
  ): Promise<{ job: ImportJob; how: 'canceled' | 'requested' }> {
    const result = await this.deps.jobs.cancel(jobId);
    if (result.ok) return { job: result.job, how: result.how };
    throw this.refusal(result);
  }

  async resume(jobId: number): Promise<ImportJob> {
    const result = await this.deps.jobs.resume(jobId);
    if (result.ok) {
      await this.requestWorker(result.job);
      return result.job;
    }
    switch (result.reason) {
      case 'open_job_exists':
        throw new ImportApiError(
          'OPEN_JOB_EXISTS',
          'This entity already has another open import.'
        );
      case 'import_running':
        throw this.alreadyRunning(result.entity);
      default:
        throw this.refusal(result);
    }
  }

  async recheck(jobId: number): Promise<ImportJob> {
    const result = await this.deps.jobs.recheck(jobId);
    if (result.ok) {
      await this.requestWorker(result.job);
      return result.job;
    }
    throw this.refusal(result);
  }

  /** Deletes the job and gives back what it was. */
  async remove(jobId: number): Promise<ImportJob> {
    const result = await this.deps.jobs.remove(jobId);
    if (result.ok) return result.job;
    throw this.refusal(result);
  }

  listOpen(): Promise<ImportJob[]> {
    return this.deps.jobs.listOpen();
  }

  /**
   * The job waits for a worker now. The action has been done, so a request that
   * cannot be made is not the admin's problem: the dispatch cron asks again for
   * a job that keeps waiting.
   */
  private async requestWorker(job: ImportJob): Promise<void> {
    try {
      await this.deps.requests?.request(job.uuid);
    } catch {
      // See above.
    }
  }

  private parsePhase(value: unknown, job: ImportJob): IssuePhase {
    if (value === undefined || value === null || value === '') {
      return job.startedAt === null ? 'validate' : 'import';
    }
    if (value === 'validate' || value === 'import') return value;
    throw invalid('"phase" must be validate or import.');
  }

  private busy(entity: ImportEntity): ImportApiError {
    return new ImportApiError(
      'IMPORT_RUNNING',
      `A ${IMPORT_ENTITIES[entity].routeValue} import is running. Upload a new file when it finishes, or cancel it.`,
      { entity }
    );
  }

  private alreadyRunning(entity: ImportEntity): ImportApiError {
    return new ImportApiError(
      'IMPORT_ALREADY_RUNNING',
      `A ${IMPORT_ENTITIES[entity].routeValue} import is queued or running. Only one import runs at a time.`,
      { entity }
    );
  }

  private refusal(
    result:
      | { ok: false; reason: 'not_found' }
      | { ok: false; reason: 'wrong_status'; status: string }
      | { ok: false; reason: string }
  ): ImportApiError {
    if (result.reason === 'not_found') return noSuchJob();
    const status = (result as { status?: string }).status;
    return new ImportApiError(
      'WRONG_STATUS',
      `This cannot be done to an import that is ${status}.`,
      { status }
    );
  }
}

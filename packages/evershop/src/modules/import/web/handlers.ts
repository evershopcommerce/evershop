import { FileDamagedError } from '../services/job/errors.js';
import type { ImportJob, IssuePhase } from '../services/job/types.js';
import { ImportApiError } from '../services/jobs/errors.js';
import {
  FileWithErrorsError,
  READING_STOPPED_CODES,
  fileWithErrors
} from '../services/report/fileWithErrors.js';
import type { ImportEntity } from '../services/types.js';
import { IMPORT_ENTITIES } from '../services/types.js';
import type { HttpResult, ImportWeb } from './ImportWeb.js';
import { issueView, jobView } from './jobView.js';

const ok = (data: unknown, status = 200): HttpResult => ({
  kind: 'json',
  status,
  body: { data }
});

/** The error answer: core's JSON error shape with the code of § 8.3, and what more is known. */
export function failure(web: ImportWeb, error: unknown): HttpResult {
  if (error instanceof ImportApiError) {
    return {
      kind: 'json',
      status: error.status,
      body: {
        error: {
          status: error.status,
          code: error.code,
          message: error.message,
          ...(Object.keys(error.details).length > 0
            ? { details: error.details }
            : {})
        }
      }
    };
  }
  // Anything else is a bug or a broken database: the admin gets no detail.
  web.logger.error('An import request failed', {
    error: error instanceof Error ? error.message : String(error)
  });
  return {
    kind: 'json',
    status: 500,
    body: { error: { status: 500, message: 'The request failed.' } }
  };
}

/** Runs a handler, and turns whatever it throws into the answer. */
async function guarded(
  web: ImportWeb,
  work: () => Promise<HttpResult>
): Promise<HttpResult> {
  try {
    return await work();
  } catch (e) {
    return failure(web, e);
  }
}

async function view(web: ImportWeb, jobs: ImportJob[]) {
  const ids = [
    ...new Set(
      jobs.map((job) => job.createdBy).filter((id): id is number => id !== null)
    )
  ];
  const names = ids.length > 0 ? await web.adminNames(ids) : new Map();
  return jobs.map((job) => jobView(job, names));
}

export const getJob = (web: ImportWeb, uuid: unknown) =>
  guarded(web, async () => {
    const job = await web.service.byUuid(uuid);
    return ok((await view(web, [job]))[0]);
  });

export const listOpenJobs = (web: ImportWeb) =>
  guarded(web, async () => ok(await view(web, await web.service.listOpen())));

export const getIssues = (
  web: ImportWeb,
  uuid: unknown,
  query: Record<string, unknown>
) =>
  guarded(web, async () => {
    const job = await web.service.byUuid(uuid);
    const result = await web.service.issues(job.id, query);
    return ok({
      phase: result.phase,
      page: result.page,
      limit: result.limit,
      total: result.total,
      byCode: result.byCode,
      truncated: result.truncated,
      items: result.items.map(issueView)
    });
  });

export const startJob = (web: ImportWeb, uuid: unknown) =>
  guarded(web, async () => {
    const job = await web.service.byUuid(uuid);
    return ok((await view(web, [await web.service.start(job.id)]))[0]);
  });

export const cancelJob = (web: ImportWeb, uuid: unknown) =>
  guarded(web, async () => {
    const job = await web.service.byUuid(uuid);
    const result = await web.service.cancel(job.id);
    return ok({
      ...(await view(web, [result.job]))[0],
      // `canceled`: it is over. `requested`: the worker stops between two rows.
      cancel: result.how
    });
  });

export const resumeJob = (web: ImportWeb, uuid: unknown) =>
  guarded(web, async () => {
    const job = await web.service.byUuid(uuid);
    return ok((await view(web, [await web.service.resume(job.id)]))[0]);
  });

export const recheckJob = (web: ImportWeb, uuid: unknown) =>
  guarded(web, async () => {
    const job = await web.service.byUuid(uuid);
    return ok((await view(web, [await web.service.recheck(job.id)]))[0]);
  });

export const deleteJob = (web: ImportWeb, uuid: unknown) =>
  guarded(web, async () => {
    const job = await web.service.byUuid(uuid);
    return ok((await view(web, [await web.service.remove(job.id)]))[0]);
  });

const unavailable = (why: string) =>
  new ImportApiError('FILE_UNAVAILABLE', why);

/**
 * The name the browser saves the file with: the name of the upload, without its
 * extension, and `-with-errors.csv`. Sent twice, as § 8.3 says: a plain ASCII
 * `filename` for old browsers and the encoded `filename*`.
 */
export function contentDisposition(fileName: string): string {
  const stem = fileName.replace(/\.[^./\\]{1,10}$/, '') || 'import';
  const name = `${stem}-with-errors.csv`;
  const ascii = name.replace(/[^A-Za-z0-9._ -]/g, '_');
  const encoded = encodeURIComponent(name).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/** Puts back in front what was taken from an iterator. */
async function* joined(
  first: string,
  rest: AsyncIterator<string, void, undefined>
): AsyncGenerator<string, void, undefined> {
  try {
    yield first;
    for (;;) {
      const next = await rest.next();
      if (next.done) return;
      yield next.value;
    }
  } finally {
    await rest.return?.();
  }
}

/**
 * The file with errors (D-15, § 7.3), streamed. It is refused (409
 * `FILE_UNAVAILABLE`) before a byte is sent when there is no file to give: the
 * upload is not complete, the file was deleted (a job that ended clean keeps
 * none), the file is empty, or the check stopped before the end of it. The
 * first chunk is read before the answer starts, so a damaged or missing file is
 * an error and not a broken download. A failure after that destroys the
 * connection (`send`), so the browser does not keep a cut file that looks whole.
 */
export const downloadFileWithErrors = (
  web: ImportWeb,
  uuid: unknown,
  query: Record<string, unknown>
) =>
  guarded(web, async () => {
    const job = await web.service.byUuid(uuid);
    if (job.chunkCount === null) {
      throw unavailable('The file has not been uploaded completely.');
    }
    // The table the page shows: the check's before the job wrote, the import's after.
    const asked = query.phase;
    let phase: IssuePhase = job.startedAt === null ? 'validate' : 'import';
    if (asked === 'validate' || asked === 'import') phase = asked;
    else if (asked !== undefined && asked !== '') {
      throw new ImportApiError(
        'INVALID_REQUEST',
        '"phase" must be validate or import.'
      );
    }
    for (const code of READING_STOPPED_CODES) {
      // Counted when it was found, kept or not (a job over the cap on stored problems).
      const counted = (job.counts.byCode.validate[code] ?? 0) > 0;
      const found = counted
        ? { total: 1 }
        : await web.service.issues(job.id, {
            phase: 'validate',
            code,
            limit: 1
          });
      if (found.total > 0) {
        throw unavailable(
          'The check could not read the whole file, so there is no copy to give. Fix the file and upload it again.'
        );
      }
    }
    const iterator = fileWithErrors({
      entity: job.entity,
      source: web.files.open(job.id),
      issues: web.issuesInRowOrder(job.id, phase),
      firstUnlistedRow: job.counts.firstUnlistedRow[phase],
      render: web.render,
      limits: web.limits
    })[Symbol.asyncIterator]();
    let first: IteratorResult<string, void>;
    try {
      first = await iterator.next();
    } catch (e) {
      if (e instanceof FileDamagedError || e instanceof FileWithErrorsError) {
        throw unavailable(
          'The file is not kept any more, or it cannot be read.'
        );
      }
      throw e;
    }
    if (first.done) {
      throw unavailable('The file is empty.');
    }
    return {
      kind: 'stream',
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': contentDisposition(job.fileName),
        'Cache-Control': 'no-store'
      },
      body: joined(first.value, iterator)
    };
  });

/**
 * The template of an entity (§ 8.3): the header row for this store and two example
 * rows with reserved keys, which the import skips. The route takes the name the
 * pages use (`categories`, `products`, `customers`, `customer-addresses`).
 */
export const downloadImportTemplate = (web: ImportWeb, which: unknown) =>
  guarded(web, async () => {
    const entity = (Object.keys(IMPORT_ENTITIES) as ImportEntity[]).find(
      (key) => IMPORT_ENTITIES[key].routeValue === which
    );
    if (entity === undefined) {
      throw new ImportApiError(
        'INVALID_REQUEST',
        `There is no template for "${String(which).slice(
          0,
          60
        )}". The templates are ${Object.values(IMPORT_ENTITIES)
          .map((e) => e.routeValue)
          .join(', ')}.`
      );
    }
    const text = await web.template(entity);
    const fileName = IMPORT_ENTITIES[entity].fileName;
    return {
      kind: 'stream',
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(
          fileName
        )}`,
        'Cache-Control': 'no-store'
      },
      body: (async function* single() {
        yield text;
      })()
    } satisfies HttpResult;
  });

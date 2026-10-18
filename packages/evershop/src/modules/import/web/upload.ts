import type { IncomingMessage } from 'http';
import multer from 'multer';
import type { StorageEngine } from 'multer';
import type { ImportJob } from '../services/job/types.js';
import { ImportApiError } from '../services/jobs/errors.js';
import { failure } from './handlers.js';
import type { HttpResult, ImportWeb } from './ImportWeb.js';
import { jobView } from './jobView.js';

type UploadRequest = IncomingMessage & {
  body?: Record<string, unknown>;
  file?: Express.Multer.File & {
    importResult?: { job: ImportJob; replaced: boolean };
    fieldsSeen?: string[];
  };
};

const invalid = (message: string) =>
  new ImportApiError('INVALID_REQUEST', message);

/**
 * Multer reads the multipart body, and this storage engine hands the stream of
 * the `file` part straight to `ImportService.upload`, so the file goes into the
 * database chunk by chunk and web memory stays at a few MiB for any file size.
 * The fields that came before the file are already in `req.body` (multer fills
 * it as they arrive), which is why `entity`, `mode` and `checkImages` must come
 * **before** `file` (§ 8.3).
 */
function importStorage(
  web: ImportWeb,
  adminUserId: number | null
): StorageEngine {
  return {
    _handleFile(req, file, done) {
      const body = (req as UploadRequest).body ?? {};
      if (body.entity === undefined) {
        done(
          invalid('The field "entity" must be sent before the field "file".')
        );
        return;
      }
      // Which fields were known when the file began: the others came after it.
      const fieldsSeen = Object.keys(body);
      web.service
        .upload({
          entity: body.entity,
          mode: body.mode,
          checkImages: body.checkImages,
          fileName: file.originalname,
          createdBy: adminUserId,
          file: file.stream
        })
        .then(
          (importResult) => done(null, { importResult, fieldsSeen } as never),
          done
        );
    },
    // Multer calls this for a file it already took when a later part of the
    // request is refused (a second file, a limit): the job it made goes too.
    _removeFile(_req, file, done) {
      const made = (file as { importResult?: { job: ImportJob } }).importResult;
      if (!made) {
        done(null);
        return;
      }
      web.service.remove(made.job.id).then(
        () => done(null),
        () => done(null)
      );
    }
  };
}

/** What multer says when the request is not what it can read. */
function fromMulter(error: unknown): ImportApiError | null {
  const { code, message } = error as { code?: string; message?: string };
  switch (code) {
    case 'LIMIT_UNEXPECTED_FILE':
      return invalid(
        'The file must be sent in the field "file", and only one.'
      );
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_FIELD_COUNT':
    case 'LIMIT_PART_COUNT':
    case 'LIMIT_FIELD_KEY':
    case 'LIMIT_FIELD_VALUE':
      return invalid('The request has too many or too large fields.');
    default:
      return message !== undefined && /multipart|boundary/i.test(message)
        ? invalid('The request must be multipart/form-data.')
        : null;
  }
}

/**
 * `POST /import-jobs` (§ 8.3): the multipart upload. It answers with the job and
 * whether it replaced another (`replaced`). A request whose fields come after
 * the file is refused and the job it made is deleted.
 */
export function uploadJob(
  web: ImportWeb,
  request: IncomingMessage,
  response: unknown,
  adminUserId: number | null
): Promise<HttpResult> {
  return new Promise((resolve) => {
    // `defParamCharset` is multer's, and busboy's: a file name in UTF-8 is not
    // read as Latin-1. The type definitions do not list it yet.
    const options: multer.Options & { defParamCharset: string } = {
      storage: importStorage(web, adminUserId),
      defParamCharset: 'utf8',
      // The size of the file is limited by the service, which has its own code
      // for it; `single('file')` takes one file.
      limits: { fields: 10, fieldSize: 1024, parts: 12 }
    };
    const parse = multer(options).single('file');
    parse(request as never, response as never, (error: unknown) => {
      const req = request as UploadRequest;
      (async () => {
        if (error) {
          throw fromMulter(error) ?? error;
        }
        const stored = req.file;
        if (!stored?.importResult) {
          throw invalid('The request has no file in the field "file".');
        }
        const { job, replaced } = stored.importResult;
        const late = Object.keys(req.body ?? {}).filter(
          (field) => !(stored.fieldsSeen ?? []).includes(field)
        );
        if (late.length > 0) {
          // The job was made with what was known when the file began.
          await web.service.remove(job.id).catch(() => undefined);
          throw invalid(
            `The fields ${late.join(
              ', '
            )} must be sent before the field "file".`
          );
        }
        const names = job.createdBy
          ? await web.adminNames([job.createdBy])
          : new Map<number, string>();
        resolve({
          kind: 'json',
          status: 200,
          body: { data: { ...jobView(job, names), replaced } }
        });
      })().catch((e) => resolve(failure(web, e)));
    });
  });
}

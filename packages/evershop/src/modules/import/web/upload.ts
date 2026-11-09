import type { IncomingMessage } from 'http';
import multer from 'multer';
import type { StorageEngine } from 'multer';
import { ImportApiError } from '../services/jobs/errors.js';
import type { ReceivedUpload } from '../services/jobs/ImportService.js';
import { failure } from './handlers.js';
import type { HttpResult, ImportWeb } from './ImportWeb.js';
import { jobView } from './jobView.js';

type UploadRequest = IncomingMessage & {
  body?: Record<string, unknown>;
  file?: Express.Multer.File & {
    received?: ReceivedUpload;
    fieldsSeen?: string[];
  };
};

const invalid = (message: string) =>
  new ImportApiError('INVALID_REQUEST', message);

interface ImportStorage extends StorageEngine {
  /**
   * What the read of the file failed with, once it has ended: null when it did
   * not fail or never began. It never rejects.
   */
  failure(): Promise<unknown>;
}

const isAbort = (error: unknown): boolean => {
  const { name, code } = (error ?? {}) as { name?: string; code?: string };
  return name === 'AbortError' || code === 'ABORT_ERR';
};

/**
 * Why the read of the file stopped, when multer says `AbortError`. When the size
 * check (or the store) stops reading, the stream of the file is destroyed, and
 * multer reports that abort at once, while `receive` is still cleaning up (the
 * database takes a moment) and has not yet said why it stopped. That reason is
 * the answer (413, 404), and the abort is only what followed it. When `receive`
 * did not fail, or never began, there is no reason and the abort stays as it is.
 */
async function reasonBehindAbort(
  error: unknown,
  storage: ImportStorage
): Promise<unknown> {
  return isAbort(error) ? storage.failure() : null;
}

/**
 * Multer reads the multipart body, and this storage engine hands the stream of
 * the `file` part straight to `ImportService.receive`, so the file goes into the
 * database chunk by chunk and web memory stays at a few MiB for any file size.
 * The fields that came before the file are already in `req.body` (multer fills
 * it as they arrive), which is why `entity`, `mode` and `checkImages` must come
 * **before** `file` (§ 8.3).
 *
 * Only the request is read here. The swap (which deletes the entity's unstarted
 * jobs and closes a stopped one) is made after the whole request is known to be
 * valid, by `uploadJob`: a request that is refused for a field after the file, or
 * a second file, must not cost the admin the job that was there.
 */
function importStorage(
  web: ImportWeb,
  adminUserId: number | null
): ImportStorage {
  // How the read of the file ended: null if it did not fail (or did not begin).
  let reading: Promise<unknown> = Promise.resolve(null);
  return {
    failure: () => reading,
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
      const received = web.service.receive({
        entity: body.entity,
        mode: body.mode,
        checkImages: body.checkImages,
        fileName: file.originalname,
        createdBy: adminUserId,
        file: file.stream
      });
      reading = received.then(
        () => null,
        (e: unknown) => e
      );
      received.then(
        (stored) => done(null, { received: stored, fieldsSeen } as never),
        done
      );
    },
    // Multer calls this for a file it already took when a later part of the
    // request is refused (a second file, a limit): the job it made goes too.
    _removeFile(_req, file, done) {
      const made = (file as { received?: ReceivedUpload }).received;
      if (!made) {
        done(null);
        return;
      }
      web.service.discard(made).then(
        () => done(null),
        () => done(null)
      );
    }
  };
}

/** What multer says when the request is not what it can read. */
function fromMulter(error: unknown): ImportApiError | null {
  const { code, message } = error as { code?: string; message?: string };
  // The client left, or sent a body that is cut or malformed: its own doing.
  if (message !== undefined && /request (aborted|closed)/i.test(message)) {
    return invalid('The upload was cut off before the request was complete.');
  }
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
      if (
        message !== undefined &&
        /multipart|boundary|unexpected end of form|malformed part header/i.test(
          message
        )
      ) {
        return invalid('The request must be multipart/form-data.');
      }
      // Anything else multer itself raised is about the request, not the store.
      return error instanceof multer.MulterError
        ? invalid('The request is not a valid upload.')
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
    const storage = importStorage(web, adminUserId);
    const options: multer.Options & { defParamCharset: string } = {
      storage,
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
          throw (
            (await reasonBehindAbort(error, storage)) ??
            fromMulter(error) ??
            error
          );
        }
        const stored = req.file;
        if (!stored?.received) {
          throw invalid('The request has no file in the field "file".');
        }
        const late = Object.keys(req.body ?? {}).filter(
          (field) => !(stored.fieldsSeen ?? []).includes(field)
        );
        if (late.length > 0) {
          // The job was made with what was known when the file began; nothing
          // of the entity has been touched yet.
          await web.service.discard(stored.received);
          throw invalid(
            `The fields ${late.join(
              ', '
            )} must be sent before the field "file".`
          );
        }
        // The whole request is valid: now the swap.
        const { job, replaced } = await web.service
          .finalize(stored.received)
          .catch(async (e) => {
            await web.service.discard(stored.received as ReceivedUpload);
            throw e;
          });
        const names = job.createdBy
          ? await web.adminNames([job.createdBy])
          : new Map<number, string>();
        resolve({
          kind: 'json',
          status: 200,
          body: {
            data: { ...jobView(job, names, web.jobMessage), replaced }
          }
        });
      })().catch((e) => resolve(failure(web, e)));
    });
  });
}

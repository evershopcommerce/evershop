/** The codes of the API's own errors (§ 8.3). A code is never renamed or reused. */
export type ImportApiCode =
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'WRONG_STATUS'
  | 'IMPORT_RUNNING'
  | 'IMPORT_ALREADY_RUNNING'
  | 'OPEN_JOB_EXISTS'
  | 'FILE_HAS_ERRORS'
  | 'FILE_UNAVAILABLE'
  | 'FILE_TOO_LARGE';

/** The HTTP status of each code. */
export const API_STATUS: Readonly<Record<ImportApiCode, number>> = {
  INVALID_REQUEST: 400,
  NOT_FOUND: 404,
  WRONG_STATUS: 409,
  IMPORT_RUNNING: 409,
  IMPORT_ALREADY_RUNNING: 409,
  OPEN_JOB_EXISTS: 409,
  FILE_HAS_ERRORS: 409,
  FILE_UNAVAILABLE: 409,
  FILE_TOO_LARGE: 413
};

/**
 * A request the service refuses. The REST handler turns it into core's JSON
 * error shape with the extra `code`; `details` says more (the status a job is
 * in, the entity whose import is running).
 */
export class ImportApiError extends Error {
  readonly code: ImportApiCode;

  readonly status: number;

  readonly details: Record<string, unknown>;

  constructor(
    code: ImportApiCode,
    message: string,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'ImportApiError';
    this.code = code;
    this.status = API_STATUS[code];
    this.details = details;
  }
}

import type { ImportIssue, ImportSeverity } from './types.js';

/**
 * The problems of the file as a whole that stop the reader before the end of
 * the file. A job with one of them has no file with errors to give: the page
 * shows the problem, and the admin fixes the file.
 */
export const READING_STOPPED_CODES = [
  'FILE_ENCODING',
  'WRONG_DELIMITER',
  'UNCLOSED_QUOTE',
  'ROW_TOO_LARGE',
  'FILE_TOO_LARGE'
] as const;

/**
 * The stable issue codes. A code is never renamed or reused, because reports
 * and translations refer to it. The API's own error codes are separate.
 */
export const IMPORT_ISSUE_CODES = [
  'FILE_ENCODING',
  'FILE_EMPTY',
  'FILE_TOO_LARGE',
  'WRONG_DELIMITER',
  'DUPLICATE_COLUMN',
  'UNCLOSED_QUOTE',
  'ROW_TOO_LARGE',
  'ROW_WIDTH',
  'MISSING_COLUMN',
  'UNKNOWN_COLUMN',
  'MISSING_REQUIRED',
  'INVALID_VALUE',
  'INVALID_JSON',
  'DUPLICATE_KEY_IN_FILE',
  'REFERENCE_NOT_FOUND',
  'REFERENCE_AMBIGUOUS',
  'ALREADY_EXISTS',
  'NOT_FOUND',
  'OPTION_NOT_FOUND',
  'PARENT_CYCLE',
  'VARIANT_INCONSISTENT',
  'VARIANT_CONFLICT',
  'VARIANT_NOT_ADJACENT',
  'ATTRIBUTE_NOT_IN_GROUP',
  'VARIANT_DUPLICATE_COMBINATION',
  'VALUES_WILL_BE_REMOVED',
  'CONFLICT',
  'URL_KEY_RESERVED',
  'IGNORED_VALUE',
  'DUPLICATE_VALUE',
  'TEMPLATE_EXAMPLE_ROW',
  'IMAGE_UNREADABLE',
  'ADDRESS_INVALID',
  'METAFIELD_INVALID',
  'DEPENDENCY_FAILED',
  'WRITE_FAILED'
] as const;

export type ImportIssueCode = (typeof IMPORT_ISSUE_CODES)[number];

/** Codes that are only ever warnings; every other code is an error by default. */
const WARNING_CODES: ReadonlySet<ImportIssueCode> = new Set([
  'UNKNOWN_COLUMN',
  'VALUES_WILL_BE_REMOVED',
  'IGNORED_VALUE',
  'DUPLICATE_VALUE',
  'TEMPLATE_EXAMPLE_ROW'
]);

/** Columns whose cells must never be copied into an issue. */
const SECRET_COLUMNS: ReadonlySet<string> = new Set([
  'password',
  'password_hash'
]);

const MAX_COLUMN_LENGTH = 200;
const MAX_VALUE_LENGTH = 100;
// A message holds the name of a column, and that name can be as long as a cell.
// A row-level message is repeated for every row of the file, so it is capped.
const MAX_MESSAGE_LENGTH = 1000;

export function defaultSeverity(code: ImportIssueCode): ImportSeverity {
  return WARNING_CODES.has(code) ? 'warning' : 'error';
}

// PostgreSQL text cannot hold U+0000, and issues are stored in the database.
function withoutNul(text: string): string {
  return text.replace(/\u0000/g, '�');
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  // Cut by code points, so that a surrogate pair is never split. Only the
  // start of the text is looked at: a cell can be a megabyte long.
  const head = Array.from(text.slice(0, max * 2))
    .slice(0, max)
    .join('');
  return head.length < text.length ? `${head}…` : text;
}

export interface IssueInput {
  code: ImportIssueCode;
  message: string;
  params?: Record<string, unknown>;
  /** Default: the code's own severity. */
  severity?: ImportSeverity;
  rowNumber?: number;
  column?: string;
  value?: string;
}

/**
 * The one way to make an issue. It makes the issue safe to store and to show:
 * no U+0000, a cell, a column name and a message are truncated, and the cell of
 * a password column is dropped.
 */
export function createIssue(input: IssueInput): ImportIssue {
  const issue: ImportIssue = {
    code: input.code,
    severity: input.severity ?? defaultSeverity(input.code),
    params: input.params ?? {},
    message: truncate(withoutNul(input.message), MAX_MESSAGE_LENGTH)
  };
  if (input.rowNumber !== undefined) {
    issue.rowNumber = input.rowNumber;
  }
  if (input.column) {
    issue.column = truncate(withoutNul(input.column), MAX_COLUMN_LENGTH);
  }
  if (
    input.value !== undefined &&
    !(input.column && SECRET_COLUMNS.has(input.column))
  ) {
    issue.value = truncate(withoutNul(input.value), MAX_VALUE_LENGTH);
  }
  return issue;
}

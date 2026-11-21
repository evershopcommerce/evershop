import { createIssue } from '../issues.js';
import { say, sayText } from '../say.js';
import type { Say } from '../say.js';
import type { ImportIssue } from '../types.js';

/**
 * Cell parsers: one pure function for each kind of value (§ 4.5, point 5).
 *
 * A parser gets the text of one cell **after** `prepareText`: trimmed, not
 * blank, escaped where REST escapes. It returns the value in the form the
 * services want (§ 4.1) or a failure that says what is wrong. It does not know
 * the column or the row; `cellIssue` adds them.
 */
export interface CellFailure {
  ok: false;
  code: 'INVALID_VALUE' | 'INVALID_JSON';
  params: Record<string, unknown>;
  /** Ends the sentence `The value in column "x" …`. */
  problem: string;
}

export type CellResult<T> = { ok: true; value: T } | CellFailure;

export const accept = <T>(value: T): CellResult<T> => ({ ok: true, value });

// The sentence of a failure as a `say` template, kept out of sight of a
// comparison of failures as data: `problem` is its English text.
const SAID = Symbol('said');

export const refuse = (
  code: CellFailure['code'],
  params: Record<string, unknown>,
  problem: Say | string
): CellFailure => {
  const failure: CellFailure = {
    ok: false,
    code,
    params,
    problem: String(problem)
  };
  if (typeof problem !== 'string') {
    Object.defineProperty(failure, SAID, { value: problem });
  }
  return failure;
};

/** The failure as a sentence that can be said in another language. */
export function sentenceOf(failure: CellFailure): Say {
  return (
    (failure as unknown as { [SAID]?: Say })[SAID] ?? sayText(failure.problem)
  );
}

/** The limits of ALL-20: what the database column can hold. */
export const MAX_QTY = 2_147_483_647;
export const MAX_POSITION = 32_767;
/** `decimal(12,4)` holds less than this; `price` and `weight` stay below it. */
export const DECIMAL_BELOW = 100_000_000;

/** The sentence of an issue about a cell: `The value in column "x" …`. */
export function cellMessage(column: string, failure: CellFailure): Say {
  return say`The value in column "${column}" ${sentenceOf(failure)}`;
}

export function cellIssue(
  failure: CellFailure,
  where: { rowNumber: number; column: string; value?: string }
): ImportIssue {
  return createIssue({
    code: failure.code,
    rowNumber: where.rowNumber,
    column: where.column,
    params: failure.params,
    message: cellMessage(where.column, failure),
    value: where.value
  });
}

/** `1`, `0`, `true`, `false` in any letter case (ALL-10). */
export function parseBoolean(text: string): CellResult<0 | 1> {
  const word = text.toLowerCase();
  if (word === '1' || word === 'true') {
    return accept(1);
  }
  if (word === '0' || word === 'false') {
    return accept(0);
  }
  return refuse(
    'INVALID_VALUE',
    { reason: 'not_boolean' },
    say`must be 1, 0, true or false.`
  );
}

/**
 * Digits only, from 0 to `max` (ALL-20). The result is a string: the core
 * patterns check strings, and a number would pass them unchecked (§ 4.1).
 * Leading zeros are removed.
 */
export function parseWholeNumber(
  text: string,
  max: number
): CellResult<string> {
  if (!/^[0-9]+$/.test(text)) {
    return refuse(
      'INVALID_VALUE',
      { reason: 'not_whole_number' },
      say`must be a whole number: digits only, no sign, no point and no thousands separator.`
    );
  }
  const digits = text.replace(/^0+(?=[0-9])/, '');
  // Number() of a very long string is Infinity, which is out of range too.
  if (Number(digits) > max) {
    return refuse(
      'INVALID_VALUE',
      { reason: 'out_of_range', min: 0, max },
      say`must be a whole number from 0 to ${max}.`
    );
  }
  return accept(digits);
}

/**
 * A price or a weight: digits, and a point with one or two decimals (the
 * pattern of the core schema), below 100,000,000 (ALL-20). A string, see
 * `parseWholeNumber`. Leading zeros of the whole part are removed.
 */
export function parseDecimal(text: string): CellResult<string> {
  const match = /^([0-9]+)(\.[0-9]{1,2})?$/.exec(text);
  if (!match) {
    return refuse(
      'INVALID_VALUE',
      { reason: 'not_decimal' },
      say`must be a number with at most 2 decimals after a point, such as 24 or 24.50: no sign, no comma and no thousands separator.`
    );
  }
  const whole = match[1].replace(/^0+(?=[0-9])/, '');
  // Eight digits at most: below 100,000,000.
  if (whole.length > 8) {
    return refuse(
      'INVALID_VALUE',
      { reason: 'out_of_range', below: DECIMAL_BELOW },
      say`must be below ${DECIMAL_BELOW}.`
    );
  }
  return accept(whole + (match[2] ?? ''));
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

/** `YYYY-MM-DD`, a day that exists (`2026-02-30` does not). */
export function parseDate(text: string): CellResult<string> {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(text);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= daysInMonth(year, month)
    ) {
      return accept(text);
    }
  }
  return refuse(
    'INVALID_VALUE',
    { reason: 'not_date' },
    say`must be a date that exists, written YYYY-MM-DD, such as 2026-10-17.`
  );
}

/** `#RRGGBB`, in any letter case (the pattern of core's `compileField`). */
export function parseColor(text: string): CellResult<string> {
  if (/^#[0-9a-fA-F]{6}$/.test(text)) {
    return accept(text);
  }
  return refuse(
    'INVALID_VALUE',
    { reason: 'not_color' },
    say`must be a color written #RRGGBB, such as #1A2B3C.`
  );
}

/**
 * Splits a list on `|`. Every item is trimmed and an empty item is dropped
 * (`a||b` and `a|b|` are two items), so this never fails; an empty list means
 * the same as a blank cell.
 */
export function parseList(text: string): string[] {
  return text
    .split('|')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

export type JsonShape = 'object' | 'array' | 'any';

// A key named `__proto__` is dropped, so that no later merge of the parsed
// value into another object can reach a prototype.
const dropProto = (key: string, value: unknown) =>
  key === '__proto__' ? undefined : value;

/** A JSON cell (ALL-11). `expect` also checks the kind of the top-level value. */
export function parseJson(
  text: string,
  expect: JsonShape
): CellResult<unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text, dropProto);
  } catch {
    return refuse('INVALID_JSON', {}, say`is not valid JSON.`);
  }
  const isArray = Array.isArray(value);
  if (
    expect === 'object' &&
    (isArray || value === null || typeof value !== 'object')
  ) {
    return refuse(
      'INVALID_VALUE',
      { reason: 'not_object' },
      say`must be a JSON object: text between { and }.`
    );
  }
  if (expect === 'array' && !isArray) {
    return refuse(
      'INVALID_VALUE',
      { reason: 'not_array' },
      say`must be a JSON array: text between [ and ].`
    );
  }
  return accept(value);
}

/**
 * An `http` or `https` address (IMG-01), returned as written: the image's
 * destination in storage comes from this text (§ 5.8). Spaces and control
 * characters are refused; the URL parser would quietly drop or encode them.
 */
export function parseHttpUrl(text: string): CellResult<string> {
  if (/^https?:\/\//i.test(text) && !/[\s\u0000-\u001f\u007f]/.test(text)) {
    try {
      // Throws when there is no host (`https://`) or the address is broken.
      new URL(text);
      return accept(text);
    } catch {
      // Falls through to the refusal below.
    }
  }
  return refuse(
    'INVALID_VALUE',
    { reason: 'not_url' },
    say`must be an address that starts with http:// or https:// and has no spaces.`
  );
}

/**
 * The old path of a redirect (PRD-23): starts with `/`, no space, no `?`, no
 * `#`. It is stored as written; the storefront compares it exactly.
 */
export function parseRedirectPath(text: string): CellResult<string> {
  if (text.startsWith('/') && !/[\s?#]/.test(text)) {
    return accept(text);
  }
  return refuse(
    'INVALID_VALUE',
    { reason: 'not_path' },
    say`must be a path that starts with / and has no spaces, ? or #.`
  );
}

/**
 * The shape of a bcrypt hash that `compareSync` can read (CUS-06, § 5.4.1). The
 * cost is at most 15: the work doubles with each step, and a hash of cost 31
 * would keep the single process of the store busy for days at the first login of
 * that customer, with no password needed to ask for it.
 */
export function parseBcryptHash(text: string): CellResult<string> {
  if (/^\$2[aby]\$(0[4-9]|1[0-5])\$[./A-Za-z0-9]{53}$/.test(text)) {
    return accept(text);
  }
  return refuse(
    'INVALID_VALUE',
    { reason: 'not_bcrypt' },
    say`is not a bcrypt hash: it starts with $2a$, $2b$ or $2y$, then a cost from 04 to 15, and is 60 characters long.`
  );
}

/**
 * The longest e-mail address (RFC 5321). Core accepts a longer one, but the
 * expression below backtracks on a long run of letters, and a cell can hold 64
 * KiB, so a longer address is refused before the expression runs.
 */
export const MAX_EMAIL_LENGTH = 254;

// The expression of the `email` format of `ajv-formats` ("full" mode, which
// `getAjv()` uses), so the check of core's schema and this one agree. A test
// compares the two on many strings.
const EMAIL =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

/** An e-mail address, as core's schema accepts it (CUS-01). */
export function parseEmail(text: string): CellResult<string> {
  if (text.length > MAX_EMAIL_LENGTH) {
    return refuse(
      'INVALID_VALUE',
      { reason: 'too_long', max: MAX_EMAIL_LENGTH },
      say`is longer than ${MAX_EMAIL_LENGTH} characters, which no e-mail address is.`
    );
  }
  if (EMAIL.test(text)) {
    return accept(text);
  }
  return refuse(
    'INVALID_VALUE',
    { reason: 'not_email' },
    say`must be an e-mail address, such as jane@example.com.`
  );
}

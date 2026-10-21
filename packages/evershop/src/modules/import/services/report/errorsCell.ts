import type { StoredIssue } from '../job/types.js';
import { say, sayText } from '../say.js';
import type { Say } from '../say.js';

/** What a message is made from: the code and the parameters, with the English fallback. */
export type RenderableIssue = Pick<
  StoredIssue,
  'code' | 'params' | 'message' | 'say' | 'column' | 'severity'
>;

/**
 * Turns an issue into the sentence the admin reads, in the admin's language
 * (§ 8.4, Issues: the page and the `_errors` column render the code and the
 * parameters when they are read). The real one calls the server-side `translate`;
 * without one the stored English `message` is used.
 */
export type RenderMessage = (issue: RenderableIssue) => string;

/** Says one of the sentences around the problems (`row:`, `warning:`, `(and 3 more)`) in the admin's language. */
export type RenderSentence = (sentence: Say) => string;

export const MORE_NOT_LISTED = '(more problems not listed)';

/** More than this many problems on one row: the rest are counted, not written. */
export const MAX_PROBLEMS_PER_ROW = 10;

const SEPARATOR = ' | ';

/**
 * A spreadsheet reads a cell that starts with one of these as a formula. Only
 * the text of the cell matters here, so the tab and the carriage return, which
 * `oneLine` has turned into spaces by then, are not listed.
 */
const FORMULA_START = /^[=+\-@]/;

/**
 * One line: line breaks and other control characters become one space. The
 * classes are written as properties (control, line separator, paragraph
 * separator): the compiler turns the escape for U+2028 inside a regular
 * expression into the character itself, which ends the line of the expression
 * in the output.
 */
function oneLine(text: string): string {
  return text.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').trim();
}

/**
 * The name of a column as the text of a problem starts with it. The name is
 * the admin's own header cell and can be anything, `=HYPERLINK(...)` included:
 * one that a spreadsheet would read as a formula is wrapped in quotes.
 */
function columnLabel(column: string): string {
  const name = oneLine(column);
  return FORMULA_START.test(name) ? `"${name}"` : name;
}

function segment(
  issue: StoredIssue,
  render: RenderMessage,
  sentence: RenderSentence
): string {
  const text = oneLine(render(issue));
  const where = issue.column === null ? null : columnLabel(issue.column);
  if (issue.severity === 'warning') {
    return where === null
      ? sentence(say`warning: ${text}`)
      : sentence(say`warning: ${where}: ${text}`);
  }
  return where === null ? sentence(say`row: ${text}`) : `${where}: ${text}`;
}

export interface ErrorsCellOptions {
  /** The header's column names, to put the problems in the order of the columns. */
  columns: readonly string[];
  render?: RenderMessage;
  /** Says the words around the problems; English without it. */
  sentence?: RenderSentence;
  /** The row may have problems that were over the cap and are not stored (§ 8.4). */
  unlisted?: boolean;
}

/**
 * The text of the `_errors` cell of one row (§ 7.3): its problems on one line,
 * separated by ` | `. Errors come first, those of the whole row before those of
 * a column, columns left to right; then the warnings in the same order. Each
 * problem starts with the name of its column, `row:` or `warning:`, and the
 * name is quoted when a spreadsheet would read it as a formula, so the text
 * never starts with `=`, `+`, `-` or `@`. The cell value of a problem is not
 * part of it: it is shown in the problems table only, which keeps a password
 * out of the file.
 *
 * At most `MAX_PROBLEMS_PER_ROW` are written, so a row with many problems does
 * not grow past the limits of the reader when the file is uploaded again.
 */
export function errorsCell(
  issues: readonly StoredIssue[],
  options: ErrorsCellOptions
): string {
  const render = options.render ?? ((issue: RenderableIssue) => issue.message);
  const sentence = options.sentence ?? ((text: Say) => String(text));
  const position = (column: string | null) => {
    if (column === null) return -1;
    const index = options.columns.indexOf(column);
    return index === -1 ? options.columns.length : index;
  };
  // The sort is stable: problems of one kind and column stay in the order found.
  const ordered = [...issues].sort(
    (a, b) =>
      Number(a.severity === 'warning') - Number(b.severity === 'warning') ||
      position(a.column) - position(b.column)
  );
  const parts = ordered
    .slice(0, MAX_PROBLEMS_PER_ROW)
    .map((issue) => segment(issue, render, sentence));
  if (ordered.length > MAX_PROBLEMS_PER_ROW) {
    parts.push(
      sentence(say`(and ${ordered.length - MAX_PROBLEMS_PER_ROW} more)`)
    );
  }
  if (options.unlisted) {
    parts.push(sentence(sayText(MORE_NOT_LISTED)));
  }
  return parts.join(SEPARATOR);
}

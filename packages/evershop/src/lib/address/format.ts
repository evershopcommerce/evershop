/**
 * `formatAddress` — one pure function that renders display values as lines,
 * on the server (`formatted`, email, admin) and in the browser (live preview).
 * Spec § 3.6.
 *
 * `format` is a record's `fmt` or `lfmt`: `%n` separates lines, `%N %O %A %D
 * %C %S %Z %X` are tokens, everything else is literal. Each line is processed
 * structurally: a token with no value vanishes together with one adjacent
 * literal (the separator that introduced it, else the one that follows), so
 * `%C, %S %Z` without a state becomes `Mountain View 94043` and without a
 * postal code `Mountain View, California`. A regex pass then collapses
 * whitespace and strips any separator debris left at the ends of a line.
 * Empty lines are dropped; the country name is the last line.
 */
import type { AddressToken } from './types.js';

/** Display strings per token. `A` may be a list of lines; `country` is the display name. */
export type FormatAddressValues = Partial<
  Record<AddressToken | 'country', string | string[] | null | undefined>
>;

export interface FormatAddressOptions {
  /** Append `values.country` as the last line. Default true. */
  includeCountry?: boolean;
}

type Part =
  | { kind: 'literal'; text: string }
  | { kind: 'token'; token: string; value: string };

const TOKENS: ReadonlySet<string> = new Set([
  'N',
  'O',
  'A',
  'D',
  'C',
  'S',
  'Z',
  'X'
]);

/** Separators a format may place between tokens. Never applied inside a value. */
const LEADING_DEBRIS = /^[\s,;/\-]+/;
const TRAILING_DEBRIS = /[\s,;/\-]+$/;
const REPEATED_SEPARATOR = /([,;/])(?:\s*[,;/])+/g;
const WHITESPACE_RUN = /[ \t]{2,}/g;

/** Trimmed text of a value; list entries joined with `\n` (empty entries dropped). */
function textOf(value: string | string[] | null | undefined): string {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry !== '')
      .join('\n');
  }
  return typeof value === 'string' ? value.trim() : '';
}

function parseLine(line: string, values: FormatAddressValues): Part[] {
  const parts: Part[] = [];
  const matcher = /%([A-Za-z])/g;
  let last = 0;
  let match = matcher.exec(line);
  while (match !== null) {
    if (match.index > last) {
      parts.push({ kind: 'literal', text: line.slice(last, match.index) });
    }
    const token = match[1];
    parts.push({
      kind: 'token',
      token,
      value: TOKENS.has(token) ? textOf(values[token as AddressToken]) : ''
    });
    last = match.index + match[0].length;
    match = matcher.exec(line);
  }
  if (last < line.length) {
    parts.push({ kind: 'literal', text: line.slice(last) });
  }
  return parts;
}

/** Drop empty tokens, each with one adjacent literal, and join what remains. */
function renderLine(parts: Part[]): string {
  const removed = new Set<number>();
  parts.forEach((part, index) => {
    if (part.kind !== 'token' || part.value !== '') {
      return;
    }
    removed.add(index);
    const before = index - 1;
    const after = index + 1;
    if (
      before >= 0 &&
      parts[before].kind === 'literal' &&
      !removed.has(before)
    ) {
      removed.add(before);
    } else if (
      after < parts.length &&
      parts[after].kind === 'literal' &&
      !removed.has(after)
    ) {
      removed.add(after);
    }
  });
  return parts
    .filter((_, index) => !removed.has(index))
    .map((part) => (part.kind === 'literal' ? part.text : part.value))
    .join('');
}

function cleanLine(line: string): string {
  return line
    .replace(WHITESPACE_RUN, ' ')
    .replace(REPEATED_SEPARATOR, '$1')
    .replace(LEADING_DEBRIS, '')
    .replace(TRAILING_DEBRIS, '')
    .trim();
}

/**
 * Render `values` through `format` as display lines. Pure: region names and
 * the country name must already be resolved (`resolveAddressDisplayValues`).
 */
export function formatAddress(
  values: FormatAddressValues,
  format: string,
  opts: FormatAddressOptions = {}
): string[] {
  const lines: string[] = [];
  const pushCleaned = (text: string): void => {
    for (const piece of text.split('\n')) {
      const cleaned = cleanLine(piece);
      if (cleaned !== '') {
        lines.push(cleaned);
      }
    }
  };

  for (const formatLine of String(format ?? '').split('%n')) {
    pushCleaned(renderLine(parseLine(formatLine, values ?? {})));
  }

  if (opts.includeCountry !== false) {
    pushCleaned(textOf(values?.country));
  }
  return lines;
}

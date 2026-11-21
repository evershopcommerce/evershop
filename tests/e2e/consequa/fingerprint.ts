import { createHash } from 'node:crypto';

/**
 * A hash of a test's body: the last argument of its call, with whitespace and comments ignored. A renamed,
 * moved or re-annotated test keeps its fingerprint, and one whose steps change doesn't. Only the hash leaves
 * the customer's machine (ADR-0018).
 *
 * `line` and `column` are Playwright's 1-based location of the call. Returns null when the call can't be
 * read.
 */
export function sourceFingerprint(source: string, line: number, column: number): string | null {
  const start = offsetOf(source, line, column);
  const args = start === null ? null : callArguments(source, start);
  const body = args && args.length >= 2 ? args[args.length - 1] : undefined;
  if (body === undefined) return null;
  return `sha256:${createHash('sha256').update(body.replace(/\s+/g, ' ').trim()).digest('hex')}`;
}

function offsetOf(source: string, line: number, column: number): number | null {
  let offset = 0;
  for (let current = 1; current < line; current++) {
    const newline = source.indexOf('\n', offset);
    if (newline === -1) return null;
    offset = newline + 1;
  }
  return offset + column - 1;
}

const CLOSER: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

/**
 * The top-level arguments of the call whose callee starts at `start`, with comments removed. It understands
 * strings, template literals, regular expressions and comments, which is enough to find the call's closing
 * bracket.
 */
export function callArguments(source: string, start: number): string[] | null {
  let i = start;
  while (i < source.length && /[\w$.\s]/.test(source.charAt(i))) i++;
  if (source.charAt(i) !== '(') return null;
  i++;

  // What closes each open bracket. '`' means template text; '${' means code inside a template.
  const open: string[] = [')'];
  const args: string[] = [];
  let current = '';

  while (i < source.length) {
    const ch = source.charAt(i);
    const top = open[open.length - 1];

    if (top === '`') {
      if (ch === '\\') {
        current += source.slice(i, i + 2);
        i += 2;
      } else if (ch === '`') {
        open.pop();
        current += ch;
        i++;
      } else if (ch === '$' && source.charAt(i + 1) === '{') {
        open.push('${');
        current += '${';
        i += 2;
      } else {
        current += ch;
        i++;
      }
      continue;
    }

    if (ch === '/' && source.charAt(i + 1) === '/') {
      const newline = source.indexOf('\n', i);
      i = newline === -1 ? source.length : newline;
      current += ' ';
    } else if (ch === '/' && source.charAt(i + 1) === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) return null;
      i = end + 2;
      current += ' ';
    } else if (ch === '/' && regexMayStart(current)) {
      const end = endOfRegex(source, i);
      if (end === null) return null;
      current += source.slice(i, end);
      i = end;
    } else if (ch === '"' || ch === "'") {
      const end = endOfString(source, i);
      if (end === null) return null;
      current += source.slice(i, end);
      i = end;
    } else if (ch === '`') {
      open.push('`');
      current += ch;
      i++;
    } else if (ch in CLOSER) {
      open.push(CLOSER[ch] as string);
      current += ch;
      i++;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      const expected = top === '${' ? '}' : top;
      if (ch !== expected) return null;
      open.pop();
      if (open.length === 0) {
        if (current.trim() !== '') args.push(current);
        return args;
      }
      current += ch;
      i++;
    } else if (ch === ',' && open.length === 1) {
      args.push(current);
      current = '';
      i++;
    } else {
      current += ch;
      i++;
    }
  }
  return null;
}

const KEYWORD_BEFORE_REGEX = /\b(return|typeof|case|do|else|in|of|void|yield|await)$/;

/** Whether a `/` after `before` starts a regular expression rather than dividing. */
function regexMayStart(before: string): boolean {
  const code = before.trimEnd();
  return (
    code === '' || '(,=:[!&|?{};+-*%<>~^'.includes(code.charAt(code.length - 1)) || KEYWORD_BEFORE_REGEX.test(code)
  );
}

function endOfRegex(source: string, start: number): number | null {
  let inClass = false;
  for (let i = start + 1; i < source.length; i++) {
    const ch = source.charAt(i);
    if (ch === '\\') i++;
    else if (ch === '\n') return null;
    else if (ch === '[') inClass = true;
    else if (ch === ']') inClass = false;
    else if (ch === '/' && !inClass) {
      let end = i + 1;
      while (/[a-z]/.test(source.charAt(end))) end++;
      return end;
    }
  }
  return null;
}

function endOfString(source: string, start: number): number | null {
  const quote = source.charAt(start);
  for (let i = start + 1; i < source.length; i++) {
    const ch = source.charAt(i);
    if (ch === '\\') i++;
    else if (ch === quote) return i + 1;
    else if (ch === '\n') return null;
  }
  return null;
}

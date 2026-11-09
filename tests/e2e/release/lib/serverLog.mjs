// Errors in the store's own log (web, event and cron processes all write to
// it). EverShop's logger marks an error with ❌ (its message often starts on
// the next line); Node prints uncaught errors and unhandled rejections on its
// own. A known, accepted line goes in ALLOWED with the reason, never silently.
import fs from 'node:fs';

const ERROR_PATTERNS = [
  /❌/,
  /Unhandled(Promise)?Rejection/i,
  /uncaughtException/i,
  /\bERR_[A-Z_]+\b/,
  /^\s*(TypeError|ReferenceError|SyntaxError|RangeError):/
];

/** [pattern, reason] pairs for errors that are explained. Keep it short and
 *  remove an entry when its cause is fixed. */
const ALLOWED = [
  [
    /Exception in middleware createProduct: URL key must contain only lowercase letters/,
    'Bug B1 (wiki/release-check.md): Add Variant with an upper-case SKU; R-CAT-09 reproduces it on purpose and fails for it'
  ]
];

export function scanServerLog(file) {
  if (!fs.existsSync(file)) return [`no server log at ${file}`];
  // eslint-disable-next-line no-control-regex
  const lines = fs
    .readFileSync(file, 'utf8')
    .replace(/\x1b\[[0-9;]*m/g, '')
    .split('\n');
  const found = [];
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!ERROR_PATTERNS.some((p) => p.test(line))) return;
    // "❌ error:" with nothing after it: the message is on the next line.
    const text = /❌\s*error:\s*$/.test(line)
      ? `${line} ${(lines[i + 1] || '').trim()}`
      : line;
    if (ALLOWED.some(([p]) => p.test(text))) return;
    found.push(`server.log:${i + 1}: ${text.slice(0, 300)}`);
  });
  return found;
}

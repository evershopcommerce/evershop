import fs from 'fs';
import { error } from '../log/logger.js';

/**
 * Extract the literal source-string keys from `_("…")` / `_('…')` calls in a piece of
 * source (spec §6.22 / §6.15). Only **static string literals** are extractable — a
 * `_(variable)` or template-literal call can't be (same limitation the old build-time
 * `TranslationLoader` had). The `(?<![\w$.])` guard avoids matching `foo_(` or `obj._(`.
 */
const CALL_RE = /(?<![\w$.])_\s*\(\s*(['"])((?:\\.|(?!\1)[^\\])*)\1/g;

export function extractTranslationKeys(source: string): string[] {
  const keys = new Set<string>();
  let match: RegExpExecArray | null;
  CALL_RE.lastIndex = 0;
  while ((match = CALL_RE.exec(source)) !== null) {
    // Unescape \' \" \\ so the key matches the runtime string / the CSV key.
    keys.add(match[2].replace(/\\(['"\\])/g, '$1'));
  }
  return [...keys];
}

/**
 * Scan a set of component files (paths) for `_()` literal keys and return the deduped
 * union. Reusable by `buildEntry` (per-route manifest) and the future `i18n:report` CLI.
 * Unreadable files are skipped (logged), never throwing.
 */
export function getTranslatableKeys(paths: string[]): string[] {
  const keys = new Set<string>();
  for (const filePath of paths) {
    try {
      const source = fs.readFileSync(filePath, 'utf8');
      for (const key of extractTranslationKeys(source)) {
        keys.add(key);
      }
    } catch (err) {
      error(err);
    }
  }
  return [...keys];
}

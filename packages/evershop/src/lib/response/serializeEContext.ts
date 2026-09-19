import jsesc from 'jsesc';

/**
 * Serialize a value for embedding in an inline `<script>var eContext = …</script>` tag
 * (server → client). Must be BOTH:
 *   1. safe to embed in a `<script>` — no sequence that can break out of the tag or
 *      change JS tokenization, and
 *   2. valid JSON, so the client / SSR (`render.tsx`) can `JSON.parse` it back to the
 *      exact original value.
 *
 * This is a server→client trust boundary: `eContext` carries free-form translation
 * strings (and product/CMS content) that can contain ANY character — `</script>`,
 * quotes, backslashes, HTML, RTL/zero-width/unicode, emoji, `${…}`, line separators.
 *
 * `jsesc({ json: true, isScriptContext: true })` handles `</script`, `</style`,
 * `<!--`, `-->` and produces parseable JSON. It does NOT escape U+2028 / U+2029 (legal
 * in JSON, and — pre-ES2019 — illegal in JS string literals), so we escape those too,
 * defensively, for older clients. Replacing a *raw* separator with its `\uXXXX` text
 * form keeps the JSON parseable and round-trip-faithful.
 */
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);
const BACKSLASH = String.fromCharCode(0x5c);

export function serializeEContext(value: unknown): string {
  return jsesc(value, { json: true, isScriptContext: true })
    .split(LINE_SEPARATOR)
    .join(`${BACKSLASH}u2028`)
    .split(PARAGRAPH_SEPARATOR)
    .join(`${BACKSLASH}u2029`);
}

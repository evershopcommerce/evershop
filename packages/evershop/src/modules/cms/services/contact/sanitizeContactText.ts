import { stripTags } from '../../../../lib/util/sanitizeHtml.js';

/**
 * Characters that survive `stripTags` but should never reach storage.
 *
 * - **NUL** (U+0000) is not representable in a PostgreSQL `text` value at all —
 *   the driver raises `unsupported Unicode escape sequence` and the insert
 *   fails, which on a public endpoint means an anonymous request can 500 the
 *   route. Stripping it is a correctness fix, not just hygiene.
 * - **Other C0/C1 control characters** render as nothing or as replacement
 *   glyphs in the admin grid and can break the email body.
 * - **Bidi overrides** (U+202A–202E, U+2066–2069) re-order surrounding text
 *   when displayed. Left in place, a message can be made to *look* like it says
 *   something different in the admin list and in the notification email — the
 *   "Trojan Source" trick applied to a contact form.
 * - **Zero-width characters** (U+200B–200D, U+FEFF) are invisible and are the
 *   standard way to smuggle keywords past a moderation filter.
 *
 * `\n` and `\t` are deliberately preserved here; the multiline caller keeps
 * newlines and the single-line caller collapses all whitespace afterwards.
 */
const DISALLOWED =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/**
 * `stripTags` removes tags and *then* decodes entities, so a tag written as
 * entities (`&lt;script&gt;`) survives the strip and reassembles into literal
 * markup afterwards. For a pure text sink that is harmless — the admin grid
 * renders through React and the email body through `{{ }}`, both of which
 * escape — but it leaves a live tag sitting in the database for whatever reads
 * it next.
 *
 * Running to a fixed point closes that: each pass strips whatever the previous
 * pass's decoding produced. Legitimate text is unaffected, because `stripTags`
 * only removes things matching a real tag name — "5 < 10" survives, as it
 * should. Bounded at three passes so a crafted input cannot spin here.
 */
function stripTagsToFixedPoint(value: unknown): string {
  let out = stripTags(value);
  for (let i = 0; i < 2; i += 1) {
    const next = stripTags(out);
    if (next === out) {
      break;
    }
    out = next;
  }
  return out;
}

function scrub(value: unknown): string {
  return stripTagsToFixedPoint(value).replace(DISALLOWED, '');
}

/**
 * Single-line free text: tags removed, dangerous codepoints removed, all
 * whitespace collapsed to single spaces, then capped.
 *
 * Collapsing whitespace is also what keeps CR/LF out of values that end up in
 * an email header — the notification subject interpolates the sender's name, so
 * a name containing a newline would otherwise be a header-injection vector.
 */
export function toPlainText(value: unknown, max: number): string {
  return scrub(value).replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Multi-line free text (the message body): line breaks are meaningful and kept,
 * but runs of horizontal whitespace collapse and runs of blank lines are capped
 * at one, so a wall of newlines cannot be used to push content out of view.
 */
export function toPlainMultiline(value: unknown, max: number): string {
  return scrub(value)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

/**
 * Canonical email form for storage and for matching against customer accounts.
 * Addresses are compared case-insensitively everywhere in this feature, so they
 * are stored lowercased rather than lowercased at every read site.
 */
export function normalizeEmail(value: unknown): string {
  // Every whitespace character goes, not just the control range: an address is
  // the one field that reaches an email header (`Reply-To`), and a surviving
  // CR/LF there is header injection. Removing rather than collapsing also means
  // a multi-line payload collapses into a single malformed token that then
  // fails the address pattern, instead of silently becoming a valid-looking
  // address.
  return String(value ?? '')
    .replace(DISALLOWED, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .slice(0, 255);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `widget_uuid` arrives from an anonymous request and is compared against a
 * `UUID` column. PostgreSQL raises `invalid input syntax for type uuid` on a
 * malformed value, so passing it straight through lets anyone 500 the endpoint
 * with `{"widget_uuid":"x"}`. Anything that is not a well-formed UUID is
 * treated as "no widget supplied" instead.
 */
export function asUuidOrNull(value: unknown): string | null {
  const s = String(value ?? '').trim();
  return UUID_RE.test(s) ? s : null;
}

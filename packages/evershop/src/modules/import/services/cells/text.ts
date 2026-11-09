import type { ImportEntity } from '../types.js';

/**
 * The same tag-shaped text that the REST layer escapes
 * (`base/services/escapePayload.ts`): `<b>`, `</b>`, `<a href="…">`. A tag name
 * is letters only, so `<h1>` is not matched; `&`, quotes and a lone `<` are
 * left alone (D-23, ALL-22). A test compares this function with the real one
 * on random input, so the two cannot drift apart.
 */
const TAG = /<([a-zA-Z]+)(?:\s[^>]*)?>|<\/([a-zA-Z]+)>/g;

/**
 * Escapes the `<` and `>` of anything shaped like an HTML tag.
 *
 * Every match ends with a `>`, so nothing after the last `>` can match, and the
 * regular expression is run on the text up to it only. Without that, a cell of
 * many `<a ` and no `>` takes the expression time that grows with the square
 * of the length (0.7 s for 64 KiB, measured).
 */
export function escapeHtmlTags(text: string): string {
  const end = text.lastIndexOf('>');
  if (end === -1) {
    return text;
  }
  const head = text.slice(0, end + 1);
  const escaped = head.replace(TAG, (match) =>
    match.replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;'))
  );
  return escaped + text.slice(end + 1);
}

/**
 * The columns that the REST layer does not escape (`skipEscape` in the
 * `payloadSchema.json` files) and the columns that hold a secret. The set is a
 * constant, and a test reads the `payloadSchema.json` files and fails when REST
 * changes it (ALL-22).
 *
 * `meta_description` is escaped, although `productDataSchema.json` carries a
 * `skipEscape` on it: that file is the service's schema and the keyword does
 * nothing there; the REST schema of a product does not mention it.
 */
export function isEscapeExempt(entity: ImportEntity, column: string): boolean {
  if (column.startsWith('metafield:')) {
    return true;
  }
  if (entity === 'customer') {
    return column === 'password' || column === 'password_hash';
  }
  return (
    (entity === 'product' || entity === 'category') && column === 'description'
  );
}

/**
 * What a text cell is before anything reads it (§ 5.1, D-23):
 * leading and trailing spaces removed (not for a `password`, where a space is a
 * character), then escaped as REST does unless the column is exempt. A blank
 * cell is `null`: "not provided", which on create means the default and on
 * update means unchanged.
 */
export function prepareText(
  cell: string,
  entity: ImportEntity,
  column: string
): string | null {
  const keepSpaces = entity === 'customer' && column === 'password';
  const text = keepSpaces ? cell : cell.trim();
  if (text === '') {
    return null;
  }
  return isEscapeExempt(entity, column) ? text : escapeHtmlTags(text);
}

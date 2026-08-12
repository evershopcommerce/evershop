import { pool } from '../../../lib/postgres/connection.js';
import { getActiveTheme } from '../../../lib/util/getActiveTheme.js';

export type PreviewThemeDecision =
  | { ok: true }
  | { ok: false; changesetTheme: string | null; activeTheme: string | null };

/**
 * Decide whether a `?changeset=<token>` storefront preview may proceed under
 * the currently-active theme (spec 04 § 9.4).
 *
 * Returns `{ ok: true }` when:
 *   - there is no preview token (a normal storefront request), or
 *   - the token doesn't resolve to a changeset (nothing to preview), or
 *   - the changeset's theme matches the active theme.
 *
 * Returns `{ ok: false, changesetTheme, activeTheme }` on a mismatch, so the
 * caller can choose the response (409 for JSON clients, 302 for browsers).
 *
 * `theme === theme` with JS equality already handles the NULL bucket
 * (`null === null` is `true`), so no `IS NOT DISTINCT FROM` is needed here.
 */
export async function decidePreviewThemeMatch(
  token: string | null
): Promise<PreviewThemeDecision> {
  if (!token) return { ok: true };
  const result = await pool.query(
    `SELECT theme FROM changeset WHERE token = $1 LIMIT 1`,
    [token]
  );
  if (result.rows.length === 0) return { ok: true };
  const changesetTheme = ((result.rows[0] as { theme: string | null }).theme ??
    null) as string | null;
  const activeTheme = getActiveTheme();
  if (changesetTheme === activeTheme) return { ok: true };
  return { ok: false, changesetTheme, activeTheme };
}

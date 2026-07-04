import { pool } from '../../../lib/postgres/connection.js';

/**
 * Possession-based preview trust: is `token` a real `?changeset=<token>`?
 *
 * A page-builder changeset token is a server-minted secret handed only to an
 * admin who opened an editing session, and the storefront already trusts it to
 * overlay unpublished widget operations (see `loadActiveOps`). The same
 * possession therefore authorizes previewing an entity that isn't publicly live
 * yet — a draft or a not-yet-in-window landing page — so its real URL renders
 * in the editor iframe instead of a 404. Theme mismatch is handled separately,
 * upstream, by the `enforcePreviewThemeMatch` all-middleware.
 *
 * Returns false for a missing token or one that resolves to no changeset (a
 * random `?changeset=…` can't unlock a draft). See wiki/landing-pages.md.
 */
export async function isValidPreviewToken(
  token: string | null | undefined
): Promise<boolean> {
  if (!token) {
    return false;
  }
  const result = await pool.query(
    'SELECT 1 FROM changeset WHERE token = $1 LIMIT 1',
    [token]
  );
  return result.rows.length > 0;
}

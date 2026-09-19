import { pool } from '../../../lib/postgres/connection.js';
import { getActiveTheme } from '../../../lib/util/getActiveTheme.js';
import type { ChangesetOperationRow } from '../../../types/db/index.js';

/**
 * Fetch the changeset operations that should be overlaid on the current
 * storefront request.
 *
 * Two modes:
 *   - **Preview** — caller passes a `previewChangesetToken`. Returns the
 *     specified changeset's ops. Used by the page-builder iframe via the
 *     `?changeset=<token>` query param.
 *   - **Production** — no token. Returns the union of operations from every
 *     active rollout plan (`start_time <= NOW() < end_time`).
 *
 * Per-route undo/redo (spec § 5.1, § 5.4). The cursor source differs by mode:
 *
 *   - **Preview** uses `changeset.route_cursors` — the live editor state, so
 *     the iframe reflects the merchandiser's current undo/redo position.
 *   - **Production** uses `rollout_plan.route_cursors` — the snapshot frozen
 *     at Save time. In-progress edits in the editor (which advance
 *     `changeset.route_cursors`) do not leak to the live storefront until the
 *     merchandiser clicks Save and the rollout's snapshot is updated.
 *
 * Either way: an op is included iff `op.change_order <= cursor[op.route]`
 * (default 0 when the route is absent from the map). Returned ops are ordered
 * by `change_order` ascending.
 */
export async function loadActiveOps(opts: {
  previewChangesetToken?: string | null;
}): Promise<{
  ops: ChangesetOperationRow[];
  /**
   * The previewed changeset's theme, when a preview token resolved to a
   * changeset. `undefined` for the rollout branch or an unknown token. The
   * caller compares it to `getActiveTheme()` and refuses to apply the overlay
   * on a mismatch (spec 04 § 9.4); the route-level 409/302 is handled by the
   * `enforcePreviewThemeMatch` storefront middleware.
   */
  changesetTheme?: string | null;
}> {
  if (opts.previewChangesetToken) {
    // Resolve the previewed changeset first so its theme is available even
    // when it has zero ops (a fresh draft). An unknown token previews
    // nothing.
    const csResult = await pool.query(
      `SELECT theme FROM changeset WHERE token = $1 LIMIT 1`,
      [opts.previewChangesetToken]
    );
    if (csResult.rows.length === 0) {
      return { ops: [] };
    }
    const changesetTheme = ((csResult.rows[0] as any).theme ?? null) as
      | string
      | null;
    const result = await pool.query(
      `SELECT op.*
       FROM changeset_operation op
       INNER JOIN changeset cs ON cs.changeset_id = op.changeset_id
       WHERE cs.token = $1
         AND op.change_order <= COALESCE((cs.route_cursors ->> op.route)::int, 0)
       ORDER BY op.change_order ASC`,
      [opts.previewChangesetToken]
    );
    return { ops: result.rows as ChangesetOperationRow[], changesetTheme };
  }
  // Production / rollout path. Filter on rp.route_cursors so editor-side
  // changes only affect the storefront once the user clicks Save (sync).
  //
  // Theme isolation (spec 04 § 9.3): rollouts only fire when their tagged
  // theme matches the currently-active one. A rollout scheduled under
  // theme A is dormant when theme B is active — its widgets aren't
  // visible either, so the filter is belt-and-braces, but it also keeps
  // the query honest by not loading dead ops.
  const activeTheme = getActiveTheme();
  const result = await pool.query(
    `SELECT op.*
     FROM changeset_operation op
     INNER JOIN rollout_plan rp ON rp.changeset_id = op.changeset_id
     WHERE rp.start_time <= NOW()
       AND (rp.end_time IS NULL OR rp.end_time > NOW())
       AND rp.theme IS NOT DISTINCT FROM $1
       AND op.change_order <= COALESCE((rp.route_cursors ->> op.route)::int, 0)
     ORDER BY op.change_order ASC`,
    [activeTheme]
  );
  return { ops: result.rows as ChangesetOperationRow[] };
}

import { commit, rollback, startTransaction } from '@evershop/postgres-query-builder';
import type { Pool } from 'pg';
import { writeAuditLog, ZERO_COUNTS } from './auditLog.js';

export interface UninstallPreview {
  widgets: number;
  placements: number;
  changesets: number;
  rollouts: number;
  draftDetails: Array<{ name: string; opsCount: number }>;
  rolloutDetails: Array<{ name: string; startTime: Date | null }>;
}

/**
 * Read what a `theme:uninstall` would delete (spec 04 § 8) — drives the CLI's
 * confirmation prompt. Pure read, no writes.
 */
export async function previewUninstall(
  themeId: string,
  pool: Pool
): Promise<UninstallPreview> {
  const widgets = await pool.query<{ c: string }>(
    `SELECT COUNT(*) AS c FROM widget_instance WHERE theme = $1`,
    [themeId]
  );
  const placements = await pool.query<{ c: string }>(
    `SELECT COUNT(*) AS c FROM widget_placement WHERE theme = $1`,
    [themeId]
  );
  const drafts = await pool.query<{ name: string; ops: string }>(
    `SELECT c.name,
            (SELECT COUNT(*) FROM changeset_operation co
              WHERE co.changeset_id = c.changeset_id) AS ops
     FROM changeset c
     WHERE c.theme = $1
     ORDER BY c.changeset_id`,
    [themeId]
  );
  const rollouts = await pool.query<{ name: string; start_time: Date | null }>(
    `SELECT name, start_time FROM rollout_plan WHERE theme = $1 ORDER BY rollout_plan_id`,
    [themeId]
  );

  return {
    widgets: Number(widgets.rows[0]?.c ?? 0),
    placements: Number(placements.rows[0]?.c ?? 0),
    changesets: drafts.rows.length,
    rollouts: rollouts.rows.length,
    draftDetails: drafts.rows.map((r) => ({
      name: r.name,
      opsCount: Number(r.ops)
    })),
    rolloutDetails: rollouts.rows.map((r) => ({
      name: r.name,
      startTime: r.start_time
    }))
  };
}

/**
 * Delete every trace of a theme's content (spec 04 § 8), transactionally.
 * Order respects FK direction: rollouts → changesets (cascades operations) →
 * widget_instance (cascades placements) → install state. Audit row last.
 */
export async function applyUninstall(themeId: string, pool: Pool): Promise<void> {
  const conn = await pool.connect();
  await startTransaction(conn);
  try {
    const widgetCount = await conn.query(
      `SELECT COUNT(*)::int AS c FROM widget_instance WHERE theme = $1`,
      [themeId]
    );
    const placementCount = await conn.query(
      `SELECT COUNT(*)::int AS c FROM widget_placement WHERE theme = $1`,
      [themeId]
    );

    await conn.query(`DELETE FROM rollout_plan WHERE theme = $1`, [themeId]);
    await conn.query(`DELETE FROM changeset WHERE theme = $1`, [themeId]);
    await conn.query(`DELETE FROM widget_instance WHERE theme = $1`, [themeId]);
    await conn.query(`DELETE FROM theme_install_state WHERE theme = $1`, [
      themeId
    ]);

    await writeAuditLog(
      conn,
      themeId,
      'uninstall',
      {
        ...ZERO_COUNTS,
        widgets_removed: Number(widgetCount.rows[0]?.c ?? 0),
        placements_removed: Number(placementCount.rows[0]?.c ?? 0)
      },
      [],
      'theme content removed'
    );

    await commit(conn);
  } catch (e) {
    await rollback(conn);
    throw e;
  }
}

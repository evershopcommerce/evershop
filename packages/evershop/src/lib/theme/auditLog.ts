import type { PoolClient } from 'pg';
import type { Conflict, DiffResult } from './diff.js';

export const ZERO_COUNTS: DiffResult['counts'] = {
  widgets_added: 0,
  widgets_updated: 0,
  widgets_removed: 0,
  placements_added: 0,
  placements_updated: 0,
  placements_removed: 0
};

/**
 * Append one row to `theme_install_log` (spec 04 § 4.6). One call per
 * install / upgrade / uninstall command. `conflicts_detail` stores the full
 * conflict tuples as JSONB so a merchant can audit what an upgrade preserved.
 */
export async function writeAuditLog(
  conn: PoolClient,
  themeId: string,
  command: 'install' | 'upgrade' | 'uninstall',
  counts: DiffResult['counts'],
  conflicts: Conflict[],
  notes?: string | null,
  appliedBy?: string | null
): Promise<void> {
  await conn.query(
    `INSERT INTO theme_install_log
       (theme, command,
        widgets_added, widgets_updated, widgets_removed,
        placements_added, placements_updated, placements_removed,
        conflicts, conflicts_detail, notes, applied_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12)`,
    [
      themeId,
      command,
      counts.widgets_added,
      counts.widgets_updated,
      counts.widgets_removed,
      counts.placements_added,
      counts.placements_updated,
      counts.placements_removed,
      conflicts.length,
      JSON.stringify(conflicts),
      notes ?? null,
      appliedBy ?? 'cli'
    ]
  );
}

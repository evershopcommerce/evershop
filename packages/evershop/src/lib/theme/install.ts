import {
  commit,
  del,
  insert,
  rollback,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import type { Pool, PoolClient } from 'pg';
import semver from 'semver';
import { writeAuditLog } from './auditLog.js';
import {
  Conflict,
  DiffResult,
  diffManifest,
  LiveDbState,
  PlanOp
} from './diff.js';
import { contentFingerprint } from './fingerprint.js';
import type { Manifest, PlacementRecord, WidgetRecord } from './manifest.js';

export interface InstallOpts {
  themeId: string;
  manifest: Manifest;
  pool: Pool;
}

export interface InstallResult {
  command: 'install' | 'upgrade' | 'no-op' | 'rejected';
  counts: DiffResult['counts'];
  conflicts: Conflict[];
  /**
   * On a fresh install, content that already existed in the DB for this theme
   * and was left untouched (not re-inserted). Non-zero when a theme author
   * builds content in the page-builder, exports it, then runs `theme:active`
   * on the same DB.
   */
  adopted?: { widgets: number; placements: number };
  /** Set when `command === 'rejected'` (a refused downgrade). */
  rejectedReason?: string;
  /**
   * Set on a `no-op` when the manifest's content differs from what's installed
   * but the `version` is unchanged — the CLI warns the author to bump it.
   */
  contentDriftAtSameVersion?: boolean;
}

const ZERO_COUNTS: DiffResult['counts'] = {
  widgets_added: 0,
  widgets_updated: 0,
  widgets_removed: 0,
  placements_added: 0,
  placements_updated: 0,
  placements_removed: 0
};

/**
 * Load the live `widget_instance` / `widget_placement` state for a theme as
 * the diff engine's `D` input (spec 04 § 7.2.1). Exported so `theme:status`
 * can run a dry-run diff without an install.
 */
export async function loadLiveDbForTheme(
  client: Pool | PoolClient,
  themeId: string
): Promise<LiveDbState> {
  const widgetRows = await client.query<
    WidgetRecord & { status?: boolean }
  >(
    `SELECT uuid::text AS uuid, type, name, settings, status
     FROM widget_instance WHERE theme = $1`,
    [themeId]
  );
  const placementRows = await client.query<PlacementRecord>(
    `SELECT p.uuid::text AS uuid, wi.uuid::text AS widget_instance_uuid,
            p.route, p.area, p.sort_order
     FROM widget_placement p
     INNER JOIN widget_instance wi ON wi.widget_instance_id = p.widget_instance_id
     WHERE p.theme = $1`,
    [themeId]
  );
  return {
    widgets: new Map(
      widgetRows.rows.map((w) => [
        w.uuid,
        { ...w, settings: w.settings ?? {} }
      ])
    ),
    placements: new Map(
      placementRows.rows.map((p) => [
        p.uuid,
        { ...p, sort_order: Number(p.sort_order) }
      ])
    )
  };
}

async function resolveWidgetInstanceId(
  conn: PoolClient,
  uuid: string
): Promise<number> {
  const { rows } = await conn.query<{ widget_instance_id: number }>(
    `SELECT widget_instance_id FROM widget_instance WHERE uuid::text = $1`,
    [uuid]
  );
  if (rows.length === 0) {
    throw new Error(
      `cannot place widget: widget_instance '${uuid}' not found (op order bug?)`
    );
  }
  return Number(rows[0].widget_instance_id);
}

async function applyWidgetOp(
  conn: PoolClient,
  themeId: string,
  op: PlanOp
): Promise<void> {
  if (op.op === 'INSERT') {
    // `status: true` per spec § 7.2.2 — installed widgets are enabled. The
    // column has no DB default, and the manifest never carries status, so we
    // stamp it here (the merchant can disable it later in the page-builder).
    await insert('widget_instance')
      .given({ status: true, ...(op.payload as object), theme: themeId })
      .execute(conn);
    return;
  }
  if (op.op === 'UPDATE') {
    await update('widget_instance')
      .given(op.payload as object)
      .where('uuid', '=', op.uuid)
      .execute(conn);
    return;
  }
  await del('widget_instance').where('uuid', '=', op.uuid).execute(conn);
}

async function applyPlacementOp(
  conn: PoolClient,
  themeId: string,
  op: PlanOp
): Promise<void> {
  if (op.op === 'INSERT') {
    const payload = { ...(op.payload as Record<string, unknown>) };
    const widgetUuid = payload.widget_instance_uuid as string;
    delete payload.widget_instance_uuid;
    payload.widget_instance_id = await resolveWidgetInstanceId(conn, widgetUuid);
    payload.theme = themeId;
    await insert('widget_placement').given(payload).execute(conn);
    return;
  }
  if (op.op === 'UPDATE') {
    await update('widget_placement')
      .given(op.payload as object)
      .where('uuid', '=', op.uuid)
      .execute(conn);
    return;
  }
  await del('widget_placement').where('uuid', '=', op.uuid).execute(conn);
}

/**
 * Apply the diff ops in array order (which is already the § 7.4 sequence). The
 * theme tag is stamped on every INSERT here — the diff stays theme-agnostic.
 */
async function applyOps(
  conn: PoolClient,
  themeId: string,
  ops: PlanOp[]
): Promise<void> {
  for (const op of ops) {
    if (op.table === 'widget_instance') {
      await applyWidgetOp(conn, themeId, op);
    } else {
      await applyPlacementOp(conn, themeId, op);
    }
  }
}

function freshInstallOps(manifest: Manifest): PlanOp[] {
  return [
    ...manifest.widgets.map(
      (w): PlanOp => ({
        table: 'widget_instance',
        op: 'INSERT',
        uuid: w.uuid,
        payload: { uuid: w.uuid, type: w.type, name: w.name, settings: w.settings }
      })
    ),
    ...manifest.placements.map(
      (p): PlanOp => ({
        table: 'widget_placement',
        op: 'INSERT',
        uuid: p.uuid,
        payload: {
          uuid: p.uuid,
          widget_instance_uuid: p.widget_instance_uuid,
          route: p.route,
          area: p.area,
          sort_order: p.sort_order
        }
      })
    )
  ];
}

/**
 * Install or upgrade a theme's content in one transaction (spec 04 § 7).
 *
 * - No `theme_install_state` row → fresh install (every manifest row inserted).
 * - Row exists, content fingerprint matches → no-op (a metadata-only release).
 * - Row exists, fingerprint differs → three-way diff + apply.
 *
 * The transaction opens with `SELECT ... FOR UPDATE` on the state row to
 * serialize concurrent upgrades of the same theme (§ 7.3).
 */
export async function installOrUpgrade(
  opts: InstallOpts
): Promise<InstallResult> {
  const conn = await opts.pool.connect();
  await startTransaction(conn);
  try {
    const stateRow = await conn.query<{ snapshot: Manifest }>(
      `SELECT snapshot FROM theme_install_state WHERE theme = $1 FOR UPDATE`,
      [opts.themeId]
    );

    if (stateRow.rows.length === 0) {
      // Fresh install. Some (or all) of the manifest's content may already
      // exist in the DB for this theme — e.g. an author built it in the
      // page-builder, exported it, then ran `theme:active` on the same DB.
      // Validation already guaranteed any pre-existing uuids belong to THIS
      // theme (a foreign-theme uuid is a hard error), so adopt those rows:
      // skip their INSERT (they're already the source of truth) and insert
      // only what's genuinely missing. This avoids colliding on the uuid
      // unique constraint while still recording the install baseline.
      const liveDb = await loadLiveDbForTheme(conn, opts.themeId);
      const toInsert = freshInstallOps(opts.manifest).filter((op) =>
        op.table === 'widget_instance'
          ? !liveDb.widgets.has(op.uuid)
          : !liveDb.placements.has(op.uuid)
      );
      await applyOps(conn, opts.themeId, toInsert);
      await conn.query(
        `INSERT INTO theme_install_state (theme, snapshot) VALUES ($1, $2::jsonb)`,
        [opts.themeId, JSON.stringify(opts.manifest)]
      );
      const widgetsAdded = toInsert.filter(
        (o) => o.table === 'widget_instance'
      ).length;
      const placementsAdded = toInsert.filter(
        (o) => o.table === 'widget_placement'
      ).length;
      const counts: DiffResult['counts'] = {
        ...ZERO_COUNTS,
        widgets_added: widgetsAdded,
        placements_added: placementsAdded
      };
      await writeAuditLog(conn, opts.themeId, 'install', counts, []);
      await commit(conn);
      return {
        command: 'install',
        counts,
        conflicts: [],
        adopted: {
          widgets: opts.manifest.widgets.length - widgetsAdded,
          placements: opts.manifest.placements.length - placementsAdded
        }
      };
    }

    // --- Version gate (spec 04 § 7.1) ---
    // Upgrades are ordered by the manifest's SemVer `version`:
    //   - lower than installed  → refuse (no downgrades / reverts)
    //   - equal to installed     → no-op (warn if content drifted)
    //   - higher than installed  → apply the content diff + record new version
    const snapshot = stateRow.rows[0].snapshot as Manifest;
    const installedVersion = snapshot.version;
    const newVersion = opts.manifest.version;
    // A legacy / invalid recorded version (e.g. a pre-rename snapshot) can't be
    // compared — treat it as upgradeable rather than crashing the comparator.
    const cmp = semver.valid(installedVersion)
      ? semver.compare(newVersion, installedVersion)
      : 1;

    if (cmp < 0) {
      await commit(conn); // nothing applied
      return {
        command: 'rejected',
        counts: { ...ZERO_COUNTS },
        conflicts: [],
        rejectedReason:
          `cannot downgrade '${opts.themeId}' from version ${installedVersion} ` +
          `to ${newVersion} — reverting a theme is not allowed`
      };
    }

    if (cmp === 0) {
      // Same version: no upgrade. Flag content drift so the CLI can nudge the
      // author to bump the version.
      const contentSame =
        contentFingerprint(opts.manifest) === contentFingerprint(snapshot);
      await commit(conn);
      return {
        command: 'no-op',
        counts: { ...ZERO_COUNTS },
        conflicts: [],
        contentDriftAtSameVersion: !contentSame
      };
    }

    // Higher version → upgrade. The content diff may be empty (a version-only
    // bump); either way the recorded version advances.
    const liveDb = await loadLiveDbForTheme(conn, opts.themeId);
    const diff = diffManifest(snapshot, opts.manifest, liveDb);
    await applyOps(conn, opts.themeId, diff.ops);
    await conn.query(
      `UPDATE theme_install_state SET snapshot = $2::jsonb, updated_at = NOW()
       WHERE theme = $1`,
      [opts.themeId, JSON.stringify(opts.manifest)]
    );
    await writeAuditLog(
      conn,
      opts.themeId,
      'upgrade',
      diff.counts,
      diff.conflicts
    );
    await commit(conn);
    return {
      command: 'upgrade',
      counts: diff.counts,
      conflicts: diff.conflicts
    };
  } catch (e) {
    await rollback(conn);
    throw e;
  }
}

/**
 * Compute the upgrade plan WITHOUT applying it (spec 04 § 6.1 `--dry-run` /
 * § 6.2 `theme:status <id>`). Returns null when the theme isn't installed.
 */
export async function dryRunDiff(
  themeId: string,
  manifest: Manifest,
  pool: Pool
): Promise<DiffResult | null> {
  const stateRow = await pool.query<{ snapshot: Manifest }>(
    `SELECT snapshot FROM theme_install_state WHERE theme = $1`,
    [themeId]
  );
  if (stateRow.rows.length === 0) return null;
  const liveDb = await loadLiveDbForTheme(pool, themeId);
  return diffManifest(stateRow.rows[0].snapshot, manifest, liveDb);
}

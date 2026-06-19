import type { Pool } from 'pg';
import type { Manifest, PlacementRecord, WidgetRecord } from './manifest.js';

export interface ExportOpts {
  themeId: string;
  pool: Pool;
  /** SemVer `version` to stamp into the exported theme.json. */
  version: string;
  /** Preserve the existing theme.json's `theme_name` when re-exporting. */
  preserveThemeName?: string;
}

/**
 * Serialize a theme's live content (active widgets + their placements) into a
 * manifest (spec 04 § 6.4 / § 6.5).
 *
 * UUIDs are read straight from the DB and NEVER regenerated — that stability
 * is the whole contract that lets buyers' customizations survive upgrades.
 * Only `status = TRUE` rows are exported: a widget the author disabled in the
 * page-builder is not part of the shipped theme.
 */
export async function exportToManifest(opts: ExportOpts): Promise<Manifest> {
  const widgetRows = await opts.pool.query<{
    uuid: string;
    type: string;
    name: string;
    settings: Record<string, unknown> | null;
  }>(
    `SELECT uuid::text AS uuid, type, name, settings
     FROM widget_instance
     WHERE theme IS NOT DISTINCT FROM $1 AND status = TRUE
     ORDER BY uuid`,
    [opts.themeId]
  );

  const placementRows = await opts.pool.query<{
    uuid: string;
    widget_instance_uuid: string;
    route: string;
    area: string;
    sort_order: number;
  }>(
    `SELECT p.uuid::text AS uuid,
            wi.uuid::text AS widget_instance_uuid,
            p.route, p.area, p.sort_order
     FROM widget_placement p
     INNER JOIN widget_instance wi ON wi.widget_instance_id = p.widget_instance_id
     WHERE p.theme IS NOT DISTINCT FROM $1 AND wi.status = TRUE
     ORDER BY p.uuid`,
    [opts.themeId]
  );

  const widgets: WidgetRecord[] = widgetRows.rows.map((r) => ({
    uuid: r.uuid,
    type: r.type,
    name: r.name,
    settings: r.settings ?? {}
  }));
  const placements: PlacementRecord[] = placementRows.rows.map((r) => ({
    uuid: r.uuid,
    widget_instance_uuid: r.widget_instance_uuid,
    route: r.route,
    area: r.area,
    sort_order: Number(r.sort_order)
  }));

  return {
    theme_name: opts.preserveThemeName ?? opts.themeId,
    version: opts.version,
    widgets,
    placements
  };
}

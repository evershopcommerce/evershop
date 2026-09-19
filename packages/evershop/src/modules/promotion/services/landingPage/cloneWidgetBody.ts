import type { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';

/**
 * Copy a widget body — every `widget_placement` row in one scope together
 * with the `widget_instance` rows behind them — into another scope, with
 * fresh uuids for both instances and placements. Settings live on the
 * instance, so a placement-only copy would couple the two scopes.
 *
 * Used by Duplicate (landing page → new landing page, `theme: 'preserve'`)
 * and by "Replace homepage" twice: homepage → backup (the snapshot) and
 * landing page → homepage (`theme: 'active'`). See
 * specifications/replace-homepage-with-landing-page.md §3, §5.
 *
 * Writes both tables directly (like `applyOperationToSource`); cms widget
 * create hooks and processors do not fire. Set-based: three statements
 * regardless of body size.
 */

export interface CloneScope {
  /** Placement route. `null` in `from` = any route; `null` in `to` = keep each row's route. */
  route: string | null;
  /** `null` = route-level placements (entity_urn IS NULL). */
  entityUrn: string | null;
}

export interface CloneWidgetBodyOptions {
  from: CloneScope;
  to: CloneScope;
  /** Rename areas, e.g. `{ landing_page_content: 'content' }`. */
  areaMap?: Record<string, string>;
  /** Source rows in these areas are skipped entirely (e.g. `['content']` for a landing page body, which never renders there). */
  excludeAreas?: string[];
  /**
   * `'active'`: copy only rows in `activeTheme`'s bucket and stamp the copies with it.
   * `'preserve'`: copy every bucket and keep each row's own theme.
   */
  theme: 'active' | 'preserve';
  activeTheme?: string | null;
  /** Source instance ids whose rows must NOT be renamed through `areaMap` (unique-index guard, spec P14). */
  keepAreaForInstanceIds?: Set<number>;
}

export interface CloneWidgetBodyResult {
  clonedInstances: number;
  clonedPlacements: number;
  /** old instance uuid → new instance uuid */
  instanceUuidMap: Map<string, string>;
  sourcePlacementIds: number[];
  sourceInstanceIds: number[];
}

const CHILD_AREA = /^columnsContainer_([0-9a-fA-F-]{36})_col_(\d+)$/;

/**
 * Rewrite one area name for the target scope: named areas through `areaMap`,
 * synthetic container-child areas onto the copied parent's uuid, everything
 * else unchanged. Pure.
 */
export function rewriteArea(
  area: string,
  instanceUuidMap: ReadonlyMap<string, string>,
  areaMap: Record<string, string> = {},
  skipAreaMap = false
): string {
  if (!skipAreaMap && Object.prototype.hasOwnProperty.call(areaMap, area)) {
    return areaMap[area];
  }
  const m = CHILD_AREA.exec(area);
  if (m) {
    const replacement = instanceUuidMap.get(m[1].toLowerCase());
    if (replacement) return `columnsContainer_${replacement}_col_${m[2]}`;
  }
  return area;
}

interface SourceRow {
  widget_placement_id: number;
  widget_instance_id: number;
  route: string;
  area: string;
  sort_order: number;
  placement_theme: string | null;
  instance_uuid: string;
}

export async function cloneWidgetBody(
  conn: PoolClient,
  opts: CloneWidgetBodyOptions
): Promise<CloneWidgetBodyResult> {
  if (opts.theme === 'active' && opts.activeTheme === undefined) {
    throw new Error('cloneWidgetBody: activeTheme is required when theme is "active"');
  }
  const params: unknown[] = [opts.from.entityUrn];
  const where: string[] = ['p.entity_urn IS NOT DISTINCT FROM $1'];
  if (opts.from.route !== null) {
    params.push(opts.from.route);
    where.push(`p.route = $${params.length}`);
  }
  if (opts.theme === 'active') {
    params.push(opts.activeTheme ?? null);
    where.push(`p.theme IS NOT DISTINCT FROM $${params.length}`);
  }
  const sourceRes = await conn.query<SourceRow>(
    `SELECT p.widget_placement_id, p.widget_instance_id, p.route, p.area, p.sort_order,
            p.theme AS placement_theme, wi.uuid::text AS instance_uuid
       FROM widget_placement p
       INNER JOIN widget_instance wi ON wi.widget_instance_id = p.widget_instance_id
      WHERE ${where.join(' AND ')}
      ORDER BY p.widget_placement_id`,
    params
  );
  const excluded = new Set(opts.excludeAreas ?? []);
  const rows = sourceRes.rows.filter((r) => !excluded.has(r.area));

  const empty: CloneWidgetBodyResult = {
    clonedInstances: 0,
    clonedPlacements: 0,
    instanceUuidMap: new Map(),
    sourcePlacementIds: sourceRes.rows.map((r) => r.widget_placement_id),
    sourceInstanceIds: [...new Set(sourceRes.rows.map((r) => r.widget_instance_id))]
  };
  if (rows.length === 0) return empty;

  // 1. One new instance per distinct source instance, in one statement.
  const oldIds: number[] = [];
  const newUuids: string[] = [];
  const instanceUuidMap = new Map<string, string>();
  const oldIdByUuid = new Map<string, number>();
  for (const r of rows) {
    const key = r.instance_uuid.toLowerCase();
    if (instanceUuidMap.has(key)) continue;
    const fresh = uuidv4();
    instanceUuidMap.set(key, fresh);
    oldIdByUuid.set(key, r.widget_instance_id);
    oldIds.push(r.widget_instance_id);
    newUuids.push(fresh);
  }
  const themeExpr =
    opts.theme === 'active' ? '$3::text' : 'wi.theme';
  const instParams: unknown[] =
    opts.theme === 'active'
      ? [oldIds, newUuids, opts.activeTheme ?? null]
      : [oldIds, newUuids];
  const insertedInstances = await conn.query<{
    widget_instance_id: number;
    uuid: string;
  }>(
    `INSERT INTO widget_instance (uuid, name, type, settings, status, theme)
     SELECT u.new_uuid, wi.name, wi.type, wi.settings, wi.status, ${themeExpr}
       FROM unnest($1::int[], $2::uuid[]) AS u(old_id, new_uuid)
       INNER JOIN widget_instance wi ON wi.widget_instance_id = u.old_id
     RETURNING widget_instance_id, uuid::text AS uuid`,
    instParams
  );
  const newIdByNewUuid = new Map<string, number>();
  for (const r of insertedInstances.rows) {
    newIdByNewUuid.set(r.uuid.toLowerCase(), r.widget_instance_id);
  }

  // 2. Placements, one multi-row statement.
  const wids: number[] = [];
  const routes: string[] = [];
  const areas: string[] = [];
  const sorts: number[] = [];
  const themes: (string | null)[] = [];
  for (const r of rows) {
    const newUuid = instanceUuidMap.get(r.instance_uuid.toLowerCase())!;
    const newId = newIdByNewUuid.get(newUuid.toLowerCase());
    if (newId === undefined) continue;
    wids.push(newId);
    routes.push(opts.to.route ?? r.route);
    areas.push(
      rewriteArea(
        r.area,
        instanceUuidMap,
        opts.areaMap,
        opts.keepAreaForInstanceIds?.has(r.widget_instance_id) ?? false
      )
    );
    sorts.push(Number(r.sort_order) || 0);
    themes.push(
      opts.theme === 'active' ? opts.activeTheme ?? null : r.placement_theme
    );
  }
  const insertedPlacements = await conn.query(
    `INSERT INTO widget_placement (widget_instance_id, route, area, sort_order, entity_urn, theme)
     SELECT u.wid, u.route, u.area, u.sort_order, $5::text, u.theme
       FROM unnest($1::int[], $2::text[], $3::text[], $4::real[], $6::text[])
            AS u(wid, route, area, sort_order, theme)`,
    [wids, routes, areas, sorts, opts.to.entityUrn, themes]
  );

  return {
    clonedInstances: insertedInstances.rowCount ?? 0,
    clonedPlacements: insertedPlacements.rowCount ?? 0,
    instanceUuidMap,
    sourcePlacementIds: rows.map((r) => r.widget_placement_id),
    sourceInstanceIds: oldIds
  };
}

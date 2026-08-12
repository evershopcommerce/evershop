import { select } from '@evershop/postgres-query-builder';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../../lib/postgres/connection.js';
import { getActiveTheme } from '../../../../lib/util/getActiveTheme.js';
import { getEnabledWidgets } from '../../../../lib/widget/widgetManager.js';
import { applyOverlayToWidgets } from '../../../pageBuilder/services/applyOverlayToWidgets.js';
import { loadActiveOps } from '../../../pageBuilder/services/loadActiveOps.js';

/**
 * Load widget instances for the current request.
 *
 * Three modes, switched by `request.currentRoute`:
 *
 *   1. Admin `widgetNew` — synthesize an in-memory widget for the
 *      `widget_setting_form` Area (no DB row yet).
 *   2. Admin `widgetEdit` — load the persisted widget_instance and surface it
 *      in `widget_setting_form` so the settings form can hydrate.
 *   3. Storefront — load source widget_instance + widget_placement state,
 *      apply the page-builder overlay (active rollout plans OR a preview
 *      changeset specified by `?changeset=<token>` for authenticated admins),
 *      filter to placements matching the current route, and emit one entry
 *      per placement. Container children live in `widget_placement` rows with
 *      synthetic `area = columnsContainer_<parent_uuid>_col_<index>` — the
 *      `Columns` storefront widget renders matching `<Area>` elements at
 *      render time so children attach via the normal Area mechanism.
 *
 * Per `02-widget-refactor-technical-specification.md` § 7.2.1: widgets whose
 * type isn't registered, or whose area isn't emitted on the current page
 * (including children of an unrendered container), silently don't render.
 */
export async function loadWidgetInstances(request) {
  const route = request.currentRoute;
  if (route.isAdmin && !['widgetEdit', 'widgetNew'].includes(route.id)) {
    return [];
  }

  const enabledWidgets = getEnabledWidgets();
  const enabledTypes = new Set(enabledWidgets.map((w) => w.type));

  // Mode 1: widgetNew — synthesize default widget for the new-widget setting form.
  if (route.isAdmin && route.id === 'widgetNew') {
    const { type } = request.params;
    const newUUID = uuidv4();
    return enabledWidgets
      .filter((w) => w.type === type)
      .map((w) => ({
        type: w.type,
        areaId: ['widget_setting_form'],
        uuid: newUUID,
        sortOrder: 0,
        settings: w.defaultSettings || {}
      }));
  }

  // Mode 2: widgetEdit — load existing widget for the setting form.
  if (route.isAdmin && route.id === 'widgetEdit') {
    const uuid = request.params.id;
    const wi = await select()
      .from('widget_instance')
      .where('uuid', '=', uuid)
      .load(pool);
    // Theme isolation: the standalone widget editor only surfaces widgets
    // tagged for the currently-active theme. A widget belonging to a
    // dormant theme is treated as not found — the admin must switch
    // themes to edit it. Matches "everything in the editor works based
    // on the current theme" (spec 04 § 2).
    const activeTheme = getActiveTheme();
    if (!wi || !enabledTypes.has(wi.type)) {
      return [];
    }
    // IS NOT DISTINCT FROM semantics: both NULL → match.
    if ((wi.theme ?? null) !== activeTheme) {
      return [];
    }
    return [
      {
        type: wi.type,
        areaId: ['widget_setting_form'],
        uuid: wi.uuid,
        sortOrder: 0,
        settings: wi.settings
      }
    ];
  }

  // Mode 3: storefront (also covers the page-builder iframe when admin loads
  // /<route>?changeset=<token>).
  return loadStorefrontWidgets(request, route, enabledTypes);
}

async function loadStorefrontWidgets(request, route, enabledTypes) {
  // Theme isolation (spec 04 § 9.2). Widgets and placements are tagged
  // with the theme they belong to (set at install / page-builder write
  // time). Only rows matching the currently-active theme — including the
  // NULL bucket when no custom theme is active — are loaded.
  // IS NOT DISTINCT FROM treats NULL = NULL as equality, so a single
  // parameterized predicate covers both buckets.
  const activeTheme = getActiveTheme();

  // 1. Source widget_instance state for the active theme.
  const widgetRows = await pool.query(
    `SELECT widget_instance_id, uuid, name, type, settings, status
     FROM widget_instance
     WHERE theme IS NOT DISTINCT FROM $1`,
    [activeTheme]
  );
  const widgetMap = new Map();
  for (const row of widgetRows.rows) {
    widgetMap.set(row.uuid, row);
  }

  // 2. Source widget_placement state, joined with widget uuid. The filter
  // is on `p.theme` (denormalized — see spec 04 § 4.2) to avoid the join
  // overhead on the hot path. Composite index (theme, route) covers it.
  const placementRows = await pool.query(
    `SELECT p.widget_placement_id, p.uuid, p.route, p.area, p.sort_order,
            p.entity_urn, wi.uuid AS widget_instance_uuid
     FROM widget_placement p
     INNER JOIN widget_instance wi ON wi.widget_instance_id = p.widget_instance_id
     WHERE p.theme IS NOT DISTINCT FROM $1`,
    [activeTheme]
  );
  const placementMap = new Map();
  for (const row of placementRows.rows) {
    placementMap.set(row.uuid, row);
  }

  // 3. Determine overlay source: preview token or active rollouts.
  //
  // The iframe loads a storefront route, which gets the storefront session
  // — separate from the admin session. So we can't check
  // `request.locals.user` or `request.session.userID` here (those belong
  // to the admin session). The changeset's UUID token itself is the
  // auth: it's a v4 UUID per spec § 7.3, only the admin who created the
  // changeset has it (or anyone the admin shared it with). The preview
  // overlay is applied for any request carrying a valid token; the token
  // limits the surface naturally.
  const previewToken = request.query?.changeset
    ? String(request.query.changeset)
    : null;
  const { ops, changesetTheme } = await loadActiveOps({
    previewChangesetToken: previewToken
  });
  // Preview theme enforcement (spec 04 § 9.4). Only overlay a preview
  // changeset that belongs to the active theme. The route-level 409/302 is
  // handled by the `enforcePreviewThemeMatch` storefront middleware before we
  // get here; this keeps the overlay inert as defence in depth. The rollout
  // branch returns `changesetTheme === undefined` (already theme-filtered in
  // SQL) → matches → applies as before.
  const previewThemeMatches =
    !previewToken ||
    changesetTheme === undefined ||
    changesetTheme === activeTheme;
  if (previewThemeMatches && ops.length > 0) {
    applyOverlayToWidgets(widgetMap, placementMap, ops);
  }

  // 4. Filter + join. One entry per surviving placement (top-level), plus
  //    one entry per child of a rendered top-level widget (children render
  //    via synthetic Areas keyed by `(parent uuid, column index)`).
  //
  // Entity-level overlay (spec 03 § 3.2): when the request resolves to a
  // single entity (e.g. a CMS page), we accept placements whose
  // `entity_urn` matches that entity in addition to route-level ones
  // (`entity_urn IS NULL`). At the same `(area, sort_order)` cell the
  // entity-specific placement wins.
  const currentEntityUrn = request.locals?.pageBuilderEntityUrn ?? null;
  const candidatePlacements = [];
  for (const placement of placementMap.values()) {
    if (placement.route !== 'all' && placement.route !== route.id) continue;
    const isEntityScoped = placement.entity_urn != null;
    if (isEntityScoped && placement.entity_urn !== currentEntityUrn) continue;
    candidatePlacements.push(placement);
  }

  // Resolve override: when the SAME widget has both a route-level placement
  // and an entity-scoped placement at the same (area, sort_order) cell, the
  // entity-scoped one wins (spec 03 § 3.2). Different widgets that happen
  // to share an (area, sort_order) cell each render independently — keying
  // by widget_instance_uuid prevents one drop from displacing another.
  const cellWinner = new Map();
  for (const p of candidatePlacements) {
    const key = `${p.widget_instance_uuid}::${p.area}::${p.sort_order ?? 0}`;
    const existing = cellWinner.get(key);
    if (!existing) {
      cellWinner.set(key, p);
      continue;
    }
    const existingScoped = existing.entity_urn != null;
    const candScoped = p.entity_urn != null;
    if (candScoped && !existingScoped) {
      cellWinner.set(key, p);
    }
  }

  // Emit one entry per surviving placement — top-level widgets and container
  // children alike. Children live in placements whose `area` starts with
  // `columnsContainer_<parent_uuid>_col_`; the `Columns` storefront widget
  // emits matching `<Area>` elements wherever the parent renders, so the
  // children naturally attach without a separate pass. If the parent isn't
  // rendered on this page (e.g. it was deleted, or its placement was undone),
  // the synthetic area isn't emitted and the child's placement entry is
  // silently dropped by the Area machinery (spec 02 § 7.2.1).
  const result = [];
  for (const placement of cellWinner.values()) {
    const widget = widgetMap.get(placement.widget_instance_uuid);
    if (!widget) continue;
    if (widget.status === false) continue;
    if (!enabledTypes.has(widget.type)) continue;

    result.push({
      type: widget.type,
      uuid: widget.uuid,
      areaId: [placement.area],
      settings: widget.settings ?? {},
      sortOrder: placement.sort_order ?? 0,
      // Surfaced so the page-builder admin's move/duplicate handlers can
      // operate on overlay-applied placement state (per-uuid sortOrder)
      // without re-querying source tables. Inert in production storefront.
      placementUuid: placement.uuid
    });
  }

  result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return result;
}

import { UrnService } from '../../../lib/urn/index.js';
import type { ChangesetOperationRow } from '../../../types/db/index.js';
import { inferOpType } from './applyOperationToSource.js';

/**
 * In-memory overlay engine for the storefront / preview path.
 *
 * Source state (`widgetMap`, `placementMap`) comes from the live DB tables.
 * The supplied `ops` are walked in `change_order` ascending and applied to
 * those maps per the conflict rules in spec 03 § 6.3:
 *   - INSERT: add (widget) or add-if-parent-widget-known (placement)
 *   - UPDATE: replace if entity exists in the map (else silently skip — the
 *     entity was deleted in source by a competing publish; the deletion wins)
 *   - DELETE: remove (no-op if already gone)
 *
 * The maps are keyed by **UUID** so the overlay never depends on auto-increment
 * IDs. After applying, the caller filters by route / type / parent and
 * produces the render-time list.
 */

export type OverlayWidget = {
  uuid: string;
  type: string;
  status: boolean;
  settings: Record<string, unknown>;
  // Anything else from the source row passes through untouched.
  [key: string]: unknown;
};

export type OverlayPlacement = {
  uuid: string;
  widget_instance_uuid: string;
  route: string;
  area: string;
  sort_order: number;
  entity_urn: string | null;
  [key: string]: unknown;
};

export function applyOverlayToWidgets(
  widgetMap: Map<string, OverlayWidget>,
  placementMap: Map<string, OverlayPlacement>,
  ops: ChangesetOperationRow[]
): void {
  // Sort defensively — caller should have ordered already, but be robust.
  const sorted = [...ops].sort((a, b) => a.change_order - b.change_order);

  for (const op of sorted) {
    const parts = UrnService.parse(op.entity_urn);
    const opType = inferOpType(op.old_payload, op.new_payload);

    if (parts.service !== 'cms') continue;

    if (parts.type === 'widget_instance') {
      applyWidgetInstanceOp(parts.uuid, opType, op, widgetMap, placementMap);
    } else if (parts.type === 'widget_placement') {
      applyWidgetPlacementOp(parts.uuid, opType, op, widgetMap, placementMap);
    }
    // Other types ignored at overlay layer — they don't affect widget render.
  }
}

function applyWidgetInstanceOp(
  uuid: string,
  opType: 'INSERT' | 'UPDATE' | 'DELETE',
  op: ChangesetOperationRow,
  widgetMap: Map<string, OverlayWidget>,
  placementMap: Map<string, OverlayPlacement>
): void {
  if (opType === 'INSERT') {
    const newW = normalizeWidget(uuid, op.new_payload as any);
    widgetMap.set(uuid, newW);
    return;
  }
  if (opType === 'UPDATE') {
    // Spec 03 § 6.3: UPDATE on a missing entity (publish-deleted by a
    // competing changeset) is silently skipped.
    const existing = widgetMap.get(uuid);
    if (!existing) return;
    // Partial UPDATEs (e.g., from inline-edit or settings-only changes)
    // must preserve source fields not in payload — type, status, parent
    // refs, etc. The publish path's SQL UPDATE has this semantic natively
    // (only listed columns are written); we mirror it here in memory.
    const payload = (op.new_payload as Record<string, unknown>) ?? {};
    const merged: OverlayWidget = { ...existing, ...payload, uuid };
    if (payload.settings !== undefined) {
      merged.settings = payload.settings as Record<string, unknown>;
    }
    widgetMap.set(uuid, merged);
    return;
  }
  // DELETE: also drop dependent placements, since the cascade only happens
  // for source-row deletions; in-memory we have to mirror it.
  widgetMap.delete(uuid);
  for (const [pUuid, p] of placementMap) {
    if (p.widget_instance_uuid === uuid) placementMap.delete(pUuid);
  }
}

function applyWidgetPlacementOp(
  uuid: string,
  opType: 'INSERT' | 'UPDATE' | 'DELETE',
  op: ChangesetOperationRow,
  widgetMap: Map<string, OverlayWidget>,
  placementMap: Map<string, OverlayPlacement>
): void {
  if (opType === 'INSERT') {
    const placement = normalizePlacement(uuid, op.new_payload as any);
    // Skip if the parent widget isn't in the in-memory set — the overlay's
    // INSERT order should mean the widget arrives before its placement, but
    // in case of stale data we don't render orphan placements.
    if (!widgetMap.has(placement.widget_instance_uuid)) return;
    placementMap.set(uuid, placement);
    return;
  }
  if (opType === 'UPDATE') {
    const existing = placementMap.get(uuid);
    if (!existing) return;
    // Same partial-update semantic as widget_instance: preserve source
    // fields not in payload.
    const payload = (op.new_payload as Record<string, unknown>) ?? {};
    placementMap.set(uuid, { ...existing, ...payload, uuid });
    return;
  }
  // DELETE
  placementMap.delete(uuid);
}

function normalizeWidget(uuid: string, payload: any): OverlayWidget {
  return {
    ...payload,
    uuid,
    status: payload?.status ?? true,
    settings: payload?.settings ?? {},
    type: payload?.type
  };
}

function normalizePlacement(uuid: string, payload: any): OverlayPlacement {
  return {
    ...payload,
    uuid,
    widget_instance_uuid: payload?.widget_instance_uuid,
    route: payload?.route,
    area: payload?.area,
    sort_order: payload?.sort_order ?? 1,
    entity_urn: payload?.entity_urn ?? null
  };
}

import { canonicallyEqual } from './canonicalize.js';
import type { Manifest, PlacementRecord, WidgetRecord } from './manifest.js';

/**
 * Three-way diff engine (spec 04 § 7.2) — the core of the upgrade path.
 *
 * Compares three states for a theme:
 *   - S (snapshot): the manifest as of the last install.
 *   - M (manifest): the manifest as it is now.
 *   - D (live DB):  the current `widget_instance` / `widget_placement` rows.
 *
 * It is a PURE function — the caller loads the live DB once and passes it in,
 * so the whole thing is trivially unit-testable. The result is an ordered op
 * list (the order IS the contract, § 7.4), a conflict list, and counts.
 */

export interface Conflict {
  widget_uuid: string;
  field_path: string;
  manifest_value: unknown;
  user_value: unknown;
}

export interface PlanOp {
  table: 'widget_instance' | 'widget_placement';
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  uuid: string;
  payload?: Record<string, unknown>;
}

export interface DiffResult {
  ops: PlanOp[];
  conflicts: Conflict[];
  counts: {
    widgets_added: number;
    widgets_updated: number;
    widgets_removed: number;
    placements_added: number;
    placements_updated: number;
    placements_removed: number;
  };
}

export interface LiveDbState {
  widgets: Map<string, WidgetRecord & { status?: boolean }>;
  placements: Map<string, PlacementRecord>;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toWidgetMap(m: Manifest): Map<string, WidgetRecord> {
  return new Map(m.widgets.map((w) => [w.uuid, w]));
}
function toPlacementMap(m: Manifest): Map<string, PlacementRecord> {
  return new Map(m.placements.map((p) => [p.uuid, p]));
}

/**
 * Scalar three-way rule (§ 7.2.3). Returns the value the DB should hold and
 * whether the decision was a conflict (user wins).
 *   S==M           → keep D (author didn't change)
 *   D==S (≠M)      → take M (author changed, user didn't)
 *   D==M (≠S)      → keep D (already in sync)
 *   otherwise      → keep D, conflict (user wins)
 */
function mergeScalar(
  s: unknown,
  m: unknown,
  d: unknown
): { value: unknown; conflict: boolean } {
  if (canonicallyEqual(s, m)) return { value: d, conflict: false };
  if (canonicallyEqual(d, s)) return { value: m, conflict: false };
  if (canonicallyEqual(d, m)) return { value: d, conflict: false };
  return { value: d, conflict: true };
}

/**
 * Recursive settings merge (§ 7.2.4). Walks the union of keys, applying the
 * 8-row missing-key matrix:
 *
 *   #  S  M  D   action
 *   1  —  —  —   no-op
 *   2  —  —  P   keep user's key
 *   3  —  P  —   insert M[k]
 *   4  —  P  P   M==D → no-op; else conflict, user wins
 *   5  P  —  —   no-op (drop from snapshot)
 *   6  P  —  P   D==S → delete; else conflict, user's key stays
 *   7  P  P  —   no-op (user deleted)
 *   8  P  P  P   recurse (objects) or scalar three-way
 *
 * Arrays are opaque (compared whole via canonical equality). Type mismatch is
 * a scalar conflict, user wins.
 */
function mergeSettings(
  s: unknown,
  m: unknown,
  d: unknown,
  uuid: string,
  path: string
): { value: Record<string, unknown>; conflicts: Conflict[] } {
  const so = isPlainObject(s) ? s : {};
  const mo = isPlainObject(m) ? m : {};
  const doo = isPlainObject(d) ? d : {};
  const result: Record<string, unknown> = {};
  const conflicts: Conflict[] = [];
  const keys = new Set([
    ...Object.keys(so),
    ...Object.keys(mo),
    ...Object.keys(doo)
  ]);

  for (const k of keys) {
    const hasS = Object.prototype.hasOwnProperty.call(so, k);
    const hasM = Object.prototype.hasOwnProperty.call(mo, k);
    const hasD = Object.prototype.hasOwnProperty.call(doo, k);
    const sk = so[k];
    const mk = mo[k];
    const dk = doo[k];
    const kPath = `${path}.${k}`;

    if (!hasS && !hasM && hasD) {
      // Row 2 — user added a key the theme never shipped.
      result[k] = dk;
    } else if (!hasS && hasM && !hasD) {
      // Row 3 — author added a new key.
      result[k] = mk;
    } else if (!hasS && hasM && hasD) {
      // Row 4 — both added it.
      if (canonicallyEqual(mk, dk)) {
        result[k] = dk;
      } else {
        result[k] = dk;
        conflicts.push({
          widget_uuid: uuid,
          field_path: kPath,
          manifest_value: mk,
          user_value: dk
        });
      }
    } else if (hasS && !hasM && !hasD) {
      // Row 5 — removed from manifest, user already deleted. Drop.
    } else if (hasS && !hasM && hasD) {
      // Row 6 — author removed the key; keep it only if the user customized
      // it (otherwise delete by omitting from result).
      const userCustomized = !canonicallyEqual(dk, sk);
      if (userCustomized) {
        result[k] = dk;
        conflicts.push({
          widget_uuid: uuid,
          field_path: kPath,
          manifest_value: undefined,
          user_value: dk
        });
      }
    } else if (hasS && hasM && !hasD) {
      // Row 7 — user deleted a key the manifest still ships. Stands.
    } else {
      // Row 8 — all three present: recurse for objects, scalar three-way
      // otherwise.
      const allObjects =
        isPlainObject(sk) && isPlainObject(mk) && isPlainObject(dk);
      if (allObjects) {
        const sub = mergeSettings(sk, mk, dk, uuid, kPath);
        result[k] = sub.value;
        conflicts.push(...sub.conflicts);
      } else {
        const r = mergeScalar(sk, mk, dk);
        result[k] = r.value;
        if (r.conflict) {
          conflicts.push({
            widget_uuid: uuid,
            field_path: kPath,
            manifest_value: mk,
            user_value: dk
          });
        }
      }
    }
  }

  return { value: result, conflicts };
}

/**
 * Merge a shared widget (present in S, M, D) over `{name, settings}`. Returns
 * the changed fields (for an UPDATE payload) + conflicts. `type`, `status`,
 * `uuid` are never merged (§ 7.2.3, § 7.2.5).
 */
function mergeSharedWidget(
  s: WidgetRecord,
  m: WidgetRecord,
  d: WidgetRecord & { status?: boolean }
): { changed: Record<string, unknown>; conflicts: Conflict[] } {
  const changed: Record<string, unknown> = {};
  const conflicts: Conflict[] = [];

  const nameResult = mergeScalar(s.name, m.name, d.name);
  if (nameResult.conflict) {
    conflicts.push({
      widget_uuid: m.uuid,
      field_path: 'name',
      manifest_value: m.name,
      user_value: d.name
    });
  }
  if (!canonicallyEqual(nameResult.value, d.name)) {
    changed.name = nameResult.value;
  }

  const settingsResult = mergeSettings(
    s.settings ?? {},
    m.settings ?? {},
    d.settings ?? {},
    m.uuid,
    'settings'
  );
  conflicts.push(...settingsResult.conflicts);
  if (!canonicallyEqual(settingsResult.value, d.settings ?? {})) {
    changed.settings = settingsResult.value;
  }

  return { changed, conflicts };
}

const PLACEMENT_FIELDS: Array<keyof PlacementRecord> = [
  'route',
  'area',
  'sort_order'
];

/**
 * Merge a shared placement over `{route, area, sort_order}`.
 * `widget_instance_uuid` is structural and never merged (§ 7.2.6).
 */
function mergeSharedPlacement(
  s: PlacementRecord,
  m: PlacementRecord,
  d: PlacementRecord
): { changed: Record<string, unknown>; conflicts: Conflict[] } {
  const changed: Record<string, unknown> = {};
  const conflicts: Conflict[] = [];
  for (const f of PLACEMENT_FIELDS) {
    const r = mergeScalar(s[f], m[f], d[f]);
    if (r.conflict) {
      conflicts.push({
        widget_uuid: m.uuid,
        field_path: f,
        manifest_value: m[f],
        user_value: d[f]
      });
    }
    if (!canonicallyEqual(r.value, d[f])) {
      changed[f] = r.value;
    }
  }
  return { changed, conflicts };
}

export function diffManifest(
  snapshot: Manifest,
  manifest: Manifest,
  liveDb: LiveDbState
): DiffResult {
  const conflicts: Conflict[] = [];
  const placementDeletes: PlanOp[] = [];
  const widgetDeletes: PlanOp[] = [];
  const widgetInserts: PlanOp[] = [];
  const placementInserts: PlanOp[] = [];
  const widgetUpdates: PlanOp[] = [];
  const placementUpdates: PlanOp[] = [];
  const counts = {
    widgets_added: 0,
    widgets_updated: 0,
    widgets_removed: 0,
    placements_added: 0,
    placements_updated: 0,
    placements_removed: 0
  };

  // ---- Widgets (§ 7.2.2) ----
  const sW = toWidgetMap(snapshot);
  const mW = toWidgetMap(manifest);
  for (const uuid of new Set([...sW.keys(), ...mW.keys()])) {
    const inS = sW.has(uuid);
    const inM = mW.has(uuid);
    const inD = liveDb.widgets.has(uuid);

    if (!inS && inM && !inD) {
      // added
      const m = mW.get(uuid)!;
      widgetInserts.push({
        table: 'widget_instance',
        op: 'INSERT',
        uuid,
        payload: { uuid, type: m.type, name: m.name, settings: m.settings }
      });
      counts.widgets_added++;
    } else if (!inS && inM && inD) {
      // collision — defense in depth (validation catches it earlier, § 5.5)
      throw new Error(
        `theme diff collision: widget '${uuid}' is in the manifest and the DB ` +
          `but not the snapshot — it already exists outside this theme's install`
      );
    } else if (inS && !inM && inD) {
      // removed
      widgetDeletes.push({ table: 'widget_instance', op: 'DELETE', uuid });
      counts.widgets_removed++;
    } else if (inS && !inM && !inD) {
      // already-removed — no-op
    } else if (inS && inM && inD) {
      // shared — merge
      const { changed, conflicts: c } = mergeSharedWidget(
        sW.get(uuid)!,
        mW.get(uuid)!,
        liveDb.widgets.get(uuid)!
      );
      conflicts.push(...c);
      if (Object.keys(changed).length > 0) {
        widgetUpdates.push({
          table: 'widget_instance',
          op: 'UPDATE',
          uuid,
          payload: changed
        });
        counts.widgets_updated++;
      }
    }
    // (inS && inM && !inD) → user-deleted — no-op
  }

  // ---- Placements (§ 7.2.6) ----
  const sP = toPlacementMap(snapshot);
  const mP = toPlacementMap(manifest);
  for (const uuid of new Set([...sP.keys(), ...mP.keys()])) {
    const inS = sP.has(uuid);
    const inM = mP.has(uuid);
    const inD = liveDb.placements.has(uuid);

    if (!inS && inM && !inD) {
      const m = mP.get(uuid)!;
      placementInserts.push({
        table: 'widget_placement',
        op: 'INSERT',
        uuid,
        payload: {
          uuid,
          widget_instance_uuid: m.widget_instance_uuid,
          route: m.route,
          area: m.area,
          sort_order: m.sort_order
        }
      });
      counts.placements_added++;
    } else if (!inS && inM && inD) {
      throw new Error(
        `theme diff collision: placement '${uuid}' is in the manifest and the ` +
          `DB but not the snapshot`
      );
    } else if (inS && !inM && inD) {
      placementDeletes.push({ table: 'widget_placement', op: 'DELETE', uuid });
      counts.placements_removed++;
    } else if (inS && !inM && !inD) {
      // already-removed
    } else if (inS && inM && inD) {
      const { changed, conflicts: c } = mergeSharedPlacement(
        sP.get(uuid)!,
        mP.get(uuid)!,
        liveDb.placements.get(uuid)!
      );
      conflicts.push(...c);
      if (Object.keys(changed).length > 0) {
        placementUpdates.push({
          table: 'widget_placement',
          op: 'UPDATE',
          uuid,
          payload: changed
        });
        counts.placements_updated++;
      }
    }
  }

  // Order of operations (§ 7.4): remove placements, remove widgets, insert
  // widgets, insert placements, update widgets, update placements.
  const ops = [
    ...placementDeletes,
    ...widgetDeletes,
    ...widgetInserts,
    ...placementInserts,
    ...widgetUpdates,
    ...placementUpdates
  ];

  return { ops, conflicts, counts };
}

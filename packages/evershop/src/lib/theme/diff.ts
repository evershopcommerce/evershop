import { canonicallyEqual } from './canonicalize.js';
import { LANDING_PAGE_MANIFEST_FIELDS, landingPageUrn } from './landingPages.js';
import type {
  LandingPageRecord,
  Manifest,
  PlacementRecord,
  WidgetRecord
} from './manifest.js';

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
  table: 'widget_instance' | 'widget_placement' | 'landing_page';
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  uuid: string;
  payload?: Record<string, unknown>;
}

/**
 * A placement as the diff sees it: the shared shape plus the entity scope a
 * nested landing-page placement carries. `entity_urn` is STRUCTURAL — like
 * `widget_instance_uuid` it is never merged, only set on INSERT.
 */
export type ScopedPlacement = PlacementRecord & { entity_urn?: string | null };

/** Live landing-page row as the diff's `D` input (manifest-carried fields only). */
export interface LandingPageLiveRow {
  uuid: string;
  name: string;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: boolean;
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
    landing_pages_added: number;
    landing_pages_updated: number;
    /**
     * Pages the manifest stopped shipping. The `landing_page` row is NEVER
     * deleted (pages are not theme property) — only its theme-owned placements
     * go. Counted so the CLI can report them.
     */
    landing_pages_released: number;
  };
  /** Pages dropped from the manifest whose row was left in place, by uuid+name. */
  releasedLandingPages: Array<{ uuid: string; name: string }>;
  /**
   * Rows already in the DB that this version of the manifest newly declares —
   * present in M and D but not in S. The author's own store after
   * `theme:export-content`: they built content in the page builder, exported
   * it, and are now re-activating. Adopted (left exactly as they are) and
   * recorded in the new snapshot, never re-inserted.
   */
  adopted: { widgets: number; placements: number; landingPages: number };
}

export interface LiveDbState {
  widgets: Map<string, WidgetRecord & { status?: boolean }>;
  placements: Map<string, ScopedPlacement>;
  /** Live rows for the landing pages this theme knows about (S ∪ M). */
  landingPages?: Map<string, LandingPageLiveRow>;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toWidgetMap(m: Manifest): Map<string, WidgetRecord> {
  return new Map(m.widgets.map((w) => [w.uuid, w]));
}
function toPlacementMap(m: Manifest): Map<string, ScopedPlacement> {
  return new Map(m.placements.map((p) => [p.uuid, { ...p, entity_urn: null }]));
}
function toLandingPageMap(m: Manifest): Map<string, LandingPageRecord> {
  return new Map((m.landingPages ?? []).map((lp) => [lp.uuid, lp]));
}

/**
 * Expand a manifest's nested landing-page placements into ordinary placements,
 * stamped with the internal route and the page's entity URN. Pages whose uuid
 * is not in `pageExists` are skipped: a page the merchant deleted is never
 * re-created, so its body has nowhere to attach.
 */
function flattenLandingPlacements(
  m: Manifest,
  pageExists: (uuid: string) => boolean
): Map<string, ScopedPlacement> {
  const out = new Map<string, ScopedPlacement>();
  for (const lp of m.landingPages ?? []) {
    if (!pageExists(lp.uuid)) continue;
    for (const p of lp.placements ?? []) {
      out.set(p.uuid, {
        uuid: p.uuid,
        widget_instance_uuid: p.widget_instance_uuid,
        route: 'landingPageView',
        area: p.area,
        sort_order: p.sort_order,
        entity_urn: landingPageUrn(lp.uuid)
      });
    }
  }
  return out;
}

/** Merge the manifest-carried fields of a landing page (three-way, merchant wins). */
function mergeSharedLandingPage(
  s: LandingPageRecord,
  m: LandingPageRecord,
  d: LandingPageLiveRow
): { changed: Record<string, unknown>; conflicts: Conflict[] } {
  const changed: Record<string, unknown> = {};
  const conflicts: Conflict[] = [];
  for (const f of LANDING_PAGE_MANIFEST_FIELDS) {
    // Absent in the manifest means "null"/"false" for the comparison, so an
    // author dropping a field reads as a change to empty, not as "no opinion".
    const sv = f === 'status' ? s.status === true : (s[f] ?? null);
    const mv = f === 'status' ? m.status === true : (m[f] ?? null);
    const dv = d[f] ?? (f === 'status' ? false : null);
    const r = mergeScalar(sv, mv, dv);
    if (r.conflict) {
      conflicts.push({
        widget_uuid: m.uuid,
        field_path: `landingPages.${f}`,
        manifest_value: mv,
        user_value: dv
      });
    }
    if (!canonicallyEqual(r.value, dv)) changed[f] = r.value;
  }
  return { changed, conflicts };
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
  const adopted = { widgets: 0, placements: 0, landingPages: 0 };
  const landingPageInserts: PlanOp[] = [];
  const landingPageUpdates: PlanOp[] = [];
  const releasedLandingPages: Array<{ uuid: string; name: string }> = [];
  const counts = {
    widgets_added: 0,
    widgets_updated: 0,
    widgets_removed: 0,
    placements_added: 0,
    placements_updated: 0,
    placements_removed: 0,
    landing_pages_added: 0,
    landing_pages_updated: 0,
    landing_pages_released: 0
  };

  // ---- Landing pages (theme-json-landing-pages spec § 5) ----
  // Resolved BEFORE placements: which pages will exist decides which nested
  // bodies are in play.
  const sL = toLandingPageMap(snapshot);
  const mL = toLandingPageMap(manifest);
  const liveL = liveDb.landingPages ?? new Map<string, LandingPageLiveRow>();
  const existingPages = new Set<string>();
  for (const uuid of new Set([...sL.keys(), ...mL.keys()])) {
    const inS = sL.has(uuid);
    const inM = mL.has(uuid);
    const inD = liveL.has(uuid);

    if (inM && !inD) {
      if (inS) {
        // Merchant deleted a page the theme still ships — never re-created.
        continue;
      }
      const m = mL.get(uuid)!;
      landingPageInserts.push({
        table: 'landing_page',
        op: 'INSERT',
        uuid,
        payload: {
          uuid,
          name: m.name,
          description: m.description ?? null,
          meta_title: m.meta_title ?? null,
          meta_description: m.meta_description ?? null,
          status: m.status === true
        }
      });
      counts.landing_pages_added++;
      existingPages.add(uuid);
    } else if (inM && inD) {
      existingPages.add(uuid);
      if (!inS) adopted.landingPages++;
      if (inS) {
        const { changed, conflicts: c } = mergeSharedLandingPage(
          sL.get(uuid)!,
          mL.get(uuid)!,
          liveL.get(uuid)!
        );
        conflicts.push(...c);
        if (Object.keys(changed).length > 0) {
          landingPageUpdates.push({
            table: 'landing_page',
            op: 'UPDATE',
            uuid,
            payload: changed
          });
          counts.landing_pages_updated++;
        }
      }
      // (!inS && inD) → adopted at install; fields left exactly as they are.
    } else if (inS && !inM && inD) {
      // Dropped from the manifest. The row STAYS (pages are not theme
      // property); its theme-owned placements are released below because they
      // are no longer in M.
      releasedLandingPages.push({ uuid, name: liveL.get(uuid)!.name });
      counts.landing_pages_released++;
    }
    // (inS && !inM && !inD) → already gone, no-op.
  }

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
      // Already in the DB under this theme, newly declared by the manifest:
      // ADOPT it. This is the author's own store after
      // `theme:export-content` — they built the widget in the page builder,
      // exported it into the manifest, and are re-activating. The row is the
      // source of truth; the new snapshot records it. (Validation has already
      // refused any uuid owned by a DIFFERENT theme.)
      adopted.widgets++;
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
  // Nested landing-page bodies are flattened in: from here on they are
  // ordinary placements that happen to carry an entity scope.
  const sP = new Map([
    ...toPlacementMap(snapshot),
    ...flattenLandingPlacements(snapshot, () => true)
  ]);
  const mP = new Map([
    ...toPlacementMap(manifest),
    ...flattenLandingPlacements(manifest, (u) => existingPages.has(u))
  ]);
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
          sort_order: m.sort_order,
          entity_urn: m.entity_urn ?? null
        }
      });
      counts.placements_added++;
    } else if (!inS && inM && inD) {
      // Adopted, same as widgets above.
      adopted.placements++;
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

  // Order of operations (§ 7.4, extended): remove placements, remove widgets,
  // insert widgets, insert landing pages (a body needs its page to exist),
  // insert placements, then the updates.
  const ops = [
    ...placementDeletes,
    ...widgetDeletes,
    ...widgetInserts,
    ...landingPageInserts,
    ...placementInserts,
    ...widgetUpdates,
    ...landingPageUpdates,
    ...placementUpdates
  ];

  return { ops, conflicts, counts, releasedLandingPages, adopted };
}

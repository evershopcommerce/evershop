import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { isValidVersion } from './version.js';

/**
 * Theme manifest (`theme.json`) reader + validator — spec 04 § 5.
 *
 * Per the 2026-06-06 decision (spec § 5.5), widget-type-registry and
 * settings-schema validation are deferred to render time: the CLI never
 * bootstraps the widget registry, so it validates structure + DB-collision
 * only and emits a non-blocking soft warning for never-before-seen types.
 */

export interface WidgetRecord {
  uuid: string;
  type: string;
  name: string;
  settings: Record<string, unknown>;
}

export interface PlacementRecord {
  uuid: string;
  widget_instance_uuid: string;
  route: string;
  area: string;
  sort_order: number;
}

export interface Manifest {
  theme_name: string;
  /**
   * The theme content's version — a valid SemVer string (spec 04 § 5.2).
   * Load-bearing: installs/upgrades are gated on it (only a strictly higher
   * version upgrades; downgrades are refused). See `install.ts`.
   */
  version: string;
  widgets: WidgetRecord[];
  placements: PlacementRecord[];
}

export interface ValidationError {
  scope: 'top-level' | 'widget' | 'placement' | 'cross-record' | 'db';
  index?: number;
  uuid?: string;
  message: string;
}

export interface ValidationContext {
  themeId: string;
  pool: Pool;
}

const SYNTHETIC_AREA_RE = /^columnsContainer_([0-9a-fA-F-]+)_col_\d+$/;

function isUuidV4(value: unknown): value is string {
  return (
    typeof value === 'string' && uuidValidate(value) && uuidVersion(value) === 4
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Read a theme's `theme.json` from its directory. Returns `null` when the file
 * doesn't exist (theme-without-content, spec § 5.1). Throws on unreadable or
 * malformed JSON — the CLI surfaces that as an activation failure.
 */
export async function readManifest(themeDir: string): Promise<Manifest | null> {
  const file = path.join(themeDir, 'theme.json');
  let raw: string;
  try {
    raw = await readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  try {
    return JSON.parse(raw) as Manifest;
  } catch (err) {
    throw new Error(
      `theme.json at ${file} is not valid JSON: ${(err as Error).message}`
    );
  }
}

/**
 * Validate a manifest against spec § 5.5. Returns every error found (empty
 * array = pass) so the CLI can print them all at once.
 */
export async function validateManifest(
  manifest: Manifest,
  ctx: ValidationContext
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Top-level. `theme_name` is intentionally NOT validated (§ 5.5 — free-form
  // display name). `version` IS required and must be valid SemVer (§ 5.2): it
  // gates install/upgrade ordering, so a malformed value (`""`, `"1.2"`,
  // `"abc"`) is rejected. `widgets`/`placements` must be arrays or the rest
  // can't run.
  if (!isValidVersion(manifest.version)) {
    errors.push({
      scope: 'top-level',
      message: `version must be a valid SemVer string (e.g. "1.2.0"); got ${JSON.stringify(
        (manifest as { version?: unknown }).version
      )}`
    });
  }
  const widgetsOk = Array.isArray(manifest.widgets);
  const placementsOk = Array.isArray(manifest.placements);
  if (!widgetsOk) {
    errors.push({ scope: 'top-level', message: 'widgets must be an array' });
  }
  if (!placementsOk) {
    errors.push({ scope: 'top-level', message: 'placements must be an array' });
  }
  // Only bail early when we can't iterate; otherwise collect all errors.
  if (!widgetsOk || !placementsOk) return errors;

  const widgetUuids = new Set<string>();
  manifest.widgets.forEach((w, index) => {
    if (!isUuidV4(w?.uuid)) {
      errors.push({
        scope: 'widget',
        index,
        uuid: typeof w?.uuid === 'string' ? w.uuid : undefined,
        message: `widget[${index}].uuid is not a valid UUID v4`
      });
    }
    if (!isNonEmptyString(w?.type)) {
      errors.push({
        scope: 'widget',
        index,
        message: `widget[${index}].type must be a non-empty string`
      });
    }
    if (!isPlainObject(w?.settings)) {
      errors.push({
        scope: 'widget',
        index,
        message: `widget[${index}].settings must be a plain object`
      });
    }
    if (isUuidV4(w?.uuid)) widgetUuids.add(w.uuid);
  });

  const placementUuids = new Set<string>();
  manifest.placements.forEach((p, index) => {
    if (!isUuidV4(p?.uuid)) {
      errors.push({
        scope: 'placement',
        index,
        uuid: typeof p?.uuid === 'string' ? p.uuid : undefined,
        message: `placement[${index}].uuid is not a valid UUID v4`
      });
    }
    if (!widgetUuids.has(p?.widget_instance_uuid)) {
      errors.push({
        scope: 'placement',
        index,
        message: `placement[${index}].widget_instance_uuid '${p?.widget_instance_uuid}' has no matching widget in widgets[]`
      });
    }
    if (!isNonEmptyString(p?.route)) {
      errors.push({
        scope: 'placement',
        index,
        message: `placement[${index}].route must be a non-empty string`
      });
    }
    if (!isNonEmptyString(p?.area)) {
      errors.push({
        scope: 'placement',
        index,
        message: `placement[${index}].area must be a non-empty string`
      });
    }
    if (typeof p?.sort_order !== 'number' || !Number.isFinite(p.sort_order)) {
      errors.push({
        scope: 'placement',
        index,
        message: `placement[${index}].sort_order must be a finite number`
      });
    }
    if (
      (p as { entity_urn?: unknown })?.entity_urn !== undefined &&
      (p as { entity_urn?: unknown }).entity_urn !== null
    ) {
      errors.push({
        scope: 'placement',
        index,
        message: `placement[${index}].entity_urn must be absent or null (theme manifests carry route-level placements only)`
      });
    }
    if (isUuidV4(p?.uuid)) placementUuids.add(p.uuid);
  });

  // Cross-record uniqueness: no dup widget uuids, no dup placement uuids, and
  // no uuid appearing in both arrays.
  if (widgetUuids.size !== manifest.widgets.filter((w) => isUuidV4(w?.uuid)).length) {
    errors.push({
      scope: 'cross-record',
      message: 'duplicate uuid(s) within widgets[]'
    });
  }
  if (
    placementUuids.size !==
    manifest.placements.filter((p) => isUuidV4(p?.uuid)).length
  ) {
    errors.push({
      scope: 'cross-record',
      message: 'duplicate uuid(s) within placements[]'
    });
  }
  for (const u of placementUuids) {
    if (widgetUuids.has(u)) {
      errors.push({
        scope: 'cross-record',
        uuid: u,
        message: `uuid '${u}' is used by both a widget and a placement`
      });
    }
  }

  // Synthetic-area parent: a child placement's area encodes its parent
  // container's uuid, which must exist in widgets[] and be a `columns` widget.
  const widgetTypeByUuid = new Map(
    manifest.widgets
      .filter((w) => isUuidV4(w?.uuid))
      .map((w) => [w.uuid, w.type])
  );
  manifest.placements.forEach((p, index) => {
    const match = typeof p?.area === 'string' && p.area.match(SYNTHETIC_AREA_RE);
    if (!match) return;
    const parentUuid = match[1];
    if (!widgetUuids.has(parentUuid)) {
      errors.push({
        scope: 'placement',
        index,
        message: `placement[${index}].area references parent widget '${parentUuid}' which is not in widgets[]`
      });
    } else if (widgetTypeByUuid.get(parentUuid) !== 'columns') {
      errors.push({
        scope: 'placement',
        index,
        message: `placement[${index}].area parent '${parentUuid}' must be a 'columns' widget (is '${widgetTypeByUuid.get(parentUuid)}')`
      });
    }
  });

  // DB collision: a widget uuid that already exists under a DIFFERENT theme
  // can't be claimed by this install.
  const dbUuids = manifest.widgets
    .map((w) => w?.uuid)
    .filter((u): u is string => isUuidV4(u));
  if (dbUuids.length > 0) {
    const { rows } = await ctx.pool.query(
      `SELECT uuid::text AS uuid, theme FROM widget_instance WHERE uuid::text = ANY($1::text[])`,
      [dbUuids]
    );
    const existingTheme = new Map<string, string | null>(
      rows.map((r: { uuid: string; theme: string | null }) => [
        r.uuid,
        r.theme ?? null
      ])
    );
    for (const w of manifest.widgets) {
      if (!isUuidV4(w?.uuid)) continue;
      const t = existingTheme.get(w.uuid);
      if (t !== undefined && t !== ctx.themeId) {
        errors.push({
          scope: 'db',
          uuid: w.uuid,
          message: `widget '${w.uuid}' already exists under theme '${t}', cannot install it under '${ctx.themeId}'`
        });
      }
    }
  }

  return errors;
}

/**
 * Non-blocking soft warning (spec § 5.5): warn for any manifest widget type
 * that has never been instantiated on this install. A fresh module install
 * legitimately introduces new types, so this is a hint, not an error.
 */
export function warnUnknownTypes(
  manifest: Manifest,
  knownTypes: Set<string>,
  warn: (message: string) => void
): void {
  if (knownTypes.size === 0) return; // empty DB — can't tell typos from new modules
  for (const w of manifest.widgets) {
    if (!knownTypes.has(w.type)) {
      warn(
        `[WARN] widget type '${w.type}' has never been used on this install. ` +
          `If you're installing the module that provides it for the first time, ` +
          `ignore this — otherwise it may be a typo in theme.json.`
      );
    }
  }
}

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';
import { validateManifestMetafieldDefinitions } from '../metafield/provision.js';
import type { ManifestMetafieldDefinition } from '../metafield/provision.js';
import { slugify } from '../util/slugify.js';
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

/**
 * A landing page shipped by a theme (`landingPages[]`).
 *
 * Deliberately carries NO `url_key` (generated at install from `name`, then
 * merchant data forever) and no publish schedule (campaign dates belong to a
 * store, not a theme). Its `placements` are nested, so the manifest never
 * spells an `entity_urn`: the installer derives the scope from the nesting.
 * See specifications/theme-json-landing-pages.md.
 */
export interface LandingPageRecord {
  uuid: string;
  name: string;
  description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  /** Defaults to false — a shipped page arrives as a draft. */
  status?: boolean;
  placements: LandingPagePlacementRecord[];
}

/** A placement inside a landing page body: like `PlacementRecord` without `route`. */
export interface LandingPagePlacementRecord {
  uuid: string;
  widget_instance_uuid: string;
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
  /**
   * Metafield definitions this theme declares (theme-metafields design).
   * Deliberately OUTSIDE the widget SemVer/snapshot protocol: entries are
   * ensured idempotently at `theme:active` and every server boot
   * (`lib/metafield/provision.ts`) — no version bump needed for changes.
   */
  metafieldDefinitions?: ManifestMetafieldDefinition[];
  /**
   * Landing pages this theme ships, each with its own nested body. Part of the
   * content SemVer/snapshot protocol (unlike `metafieldDefinitions`).
   */
  landingPages?: LandingPageRecord[];
}

export interface ValidationError {
  scope:
    | 'top-level'
    | 'widget'
    | 'placement'
    | 'landing-page'
    | 'cross-record'
    | 'db'
    | 'metafield';
  index?: number;
  uuid?: string;
  message: string;
  /** `warning` entries are reported but never block an install. */
  severity?: 'error' | 'warning';
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
  // Metafield definitions (optional section). Structure is checked by the
  // strict schema in lib/metafield/provision.ts — including the refusal of
  // `required: true`, which would break every entity save store-wide.
  if (manifest.metafieldDefinitions !== undefined) {
    const mfd = validateManifestMetafieldDefinitions(
      manifest.metafieldDefinitions
    );
    for (const e of mfd.errors) {
      errors.push({
        scope: 'metafield',
        index: e.index >= 0 ? e.index : undefined,
        message: e.message
      });
    }
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
  // container's uuid, which must exist in widgets[].
  // Parent EXISTENCE only — the type is not checked. Several widget types emit
  // synthetic child areas (`columns` per column, `section` at index 0) and more
  // may follow, so pinning the type here would reject valid manifests.
  const checkSyntheticParent = (
    area: unknown,
    scope: 'placement' | 'landing-page',
    index: number,
    label: string
  ) => {
    const match = typeof area === 'string' && area.match(SYNTHETIC_AREA_RE);
    if (!match) return;
    const parentUuid = match[1];
    if (!widgetUuids.has(parentUuid)) {
      errors.push({
        scope,
        index,
        message: `${label}.area references parent widget '${parentUuid}' which is not in widgets[]`
      });
    }
  };
  manifest.placements.forEach((p, index) => {
    checkSyntheticParent(p?.area, 'placement', index, `placement[${index}]`);
  });

  // ---- Landing pages (theme-json-landing-pages spec § 2) ----
  // Pages are not theme property, so there is no foreign-theme collision to
  // check: a uuid that already exists is ADOPTED at install, never an error.
  const landingPages = manifest.landingPages;
  if (landingPages !== undefined && !Array.isArray(landingPages)) {
    errors.push({ scope: 'top-level', message: 'landingPages must be an array' });
  } else if (Array.isArray(landingPages)) {
    const pageUuids = new Set<string>();
    landingPages.forEach((lp, index) => {
      if (!isUuidV4(lp?.uuid)) {
        errors.push({
          scope: 'landing-page',
          index,
          uuid: typeof lp?.uuid === 'string' ? lp.uuid : undefined,
          message: `landingPages[${index}].uuid is not a valid UUID v4`
        });
      } else {
        if (pageUuids.has(lp.uuid)) {
          errors.push({
            scope: 'cross-record',
            uuid: lp.uuid,
            message: `duplicate landing page uuid '${lp.uuid}'`
          });
        }
        if (widgetUuids.has(lp.uuid) || placementUuids.has(lp.uuid)) {
          errors.push({
            scope: 'cross-record',
            uuid: lp.uuid,
            message: `uuid '${lp.uuid}' is used by a landing page and a widget or placement`
          });
        }
        pageUuids.add(lp.uuid);
      }
      if (!isNonEmptyString(lp?.name)) {
        errors.push({
          scope: 'landing-page',
          index,
          message: `landingPages[${index}].name must be a non-empty string`
        });
      } else if (slugify(lp.name) === '') {
        // Not an error: install falls back to `landing-page-<uuid8>`.
        errors.push({
          scope: 'landing-page',
          index,
          severity: 'warning',
          message: `landingPages[${index}].name '${lp.name}' has no Latin characters — the generated URL will be 'landing-page-<uuid>'`
        });
      }
      for (const field of ['description', 'meta_title', 'meta_description'] as const) {
        const v = (lp as unknown as Record<string, unknown>)?.[field];
        if (v !== undefined && v !== null && typeof v !== 'string') {
          errors.push({
            scope: 'landing-page',
            index,
            message: `landingPages[${index}].${field} must be a string or null`
          });
        }
      }
      if (lp?.status !== undefined && typeof lp.status !== 'boolean') {
        errors.push({
          scope: 'landing-page',
          index,
          message: `landingPages[${index}].status must be a boolean`
        });
      }
      if ((lp as unknown as Record<string, unknown>)?.url_key !== undefined) {
        errors.push({
          scope: 'landing-page',
          index,
          message: `landingPages[${index}].url_key must be absent — the URL is generated from the name at install`
        });
      }
      if (!Array.isArray(lp?.placements)) {
        errors.push({
          scope: 'landing-page',
          index,
          message: `landingPages[${index}].placements must be an array`
        });
        return;
      }
      lp.placements.forEach((p, pIndex) => {
        const label = `landingPages[${index}].placements[${pIndex}]`;
        if (!isUuidV4(p?.uuid)) {
          errors.push({
            scope: 'landing-page',
            index,
            message: `${label}.uuid is not a valid UUID v4`
          });
        } else if (placementUuids.has(p.uuid) || widgetUuids.has(p.uuid)) {
          errors.push({
            scope: 'cross-record',
            uuid: p.uuid,
            message: `uuid '${p.uuid}' is used more than once across widgets, placements and landing page bodies`
          });
        } else {
          placementUuids.add(p.uuid);
        }
        if (!widgetUuids.has(p?.widget_instance_uuid)) {
          errors.push({
            scope: 'landing-page',
            index,
            message: `${label}.widget_instance_uuid '${p?.widget_instance_uuid}' has no matching widget in widgets[]`
          });
        }
        if (!isNonEmptyString(p?.area)) {
          errors.push({
            scope: 'landing-page',
            index,
            message: `${label}.area must be a non-empty string`
          });
        }
        if (typeof p?.sort_order !== 'number' || !Number.isFinite(p.sort_order)) {
          errors.push({
            scope: 'landing-page',
            index,
            message: `${label}.sort_order must be a finite number`
          });
        }
        for (const forbidden of ['route', 'entity_urn'] as const) {
          if ((p as unknown as Record<string, unknown>)?.[forbidden] !== undefined) {
            errors.push({
              scope: 'landing-page',
              index,
              message: `${label}.${forbidden} must be absent — a nested placement is scoped to its page by position`
            });
          }
        }
        checkSyntheticParent(p?.area, 'landing-page', index, label);
      });
    });
  }

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

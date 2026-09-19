import type { Pool } from 'pg';
import { rowToDefinition } from '../metafield/definition.js';
import {
  provisioningAvailable,
  sanitizeForManifest
} from '../metafield/provision.js';
import type { ManifestMetafieldDefinition } from '../metafield/provision.js';
import {
  derivePagesForTheme,
  landingPageUrn,
  type ExportablePage
} from './landingPages.js';
import type {
  LandingPageRecord,
  LandingPagePlacementRecord,
  Manifest,
  PlacementRecord,
  WidgetRecord
} from './manifest.js';

export interface ExportOpts {
  themeId: string;
  pool: Pool;
  /** SemVer `version` to stamp into the exported theme.json. */
  version: string;
  /** Preserve the existing theme.json's `theme_name` when re-exporting. */
  preserveThemeName?: string;
  /**
   * Which landing pages to include. Omit for every page this theme has content
   * on; pass an explicit list to pin the set (`--pages`), or `[]` to skip the
   * section entirely (`--no-pages`).
   */
  landingPageUuids?: string[];
}

/** The pages `exportToManifest` would write, for the CLI's selection prompt. */
export async function listExportablePages(
  themeId: string,
  pool: Pool
): Promise<ExportablePage[]> {
  return derivePagesForTheme(pool, themeId);
}

/**
 * Serialize a theme's live content (active widgets + their ROUTE-LEVEL
 * placements) into a manifest (spec 04 § 6.4 / § 6.5). Entity-scoped rows
 * (landing page bodies, homepage backups) are never exported — see
 * specifications/replace-homepage-with-landing-page.md §17.
 *
 * UUIDs are read straight from the DB and NEVER regenerated — that stability
 * is the whole contract that lets buyers' customizations survive upgrades.
 * Only `status = TRUE` rows are exported: a widget the author disabled in the
 * page-builder is not part of the shipped theme.
 */
export async function exportToManifest(opts: ExportOpts): Promise<Manifest> {
  // Landing pages resolved FIRST: which pages are exported decides which
  // entity-scoped placements and which body-only widgets come along.
  const derived = await derivePagesForTheme(opts.pool, opts.themeId);
  const pages =
    opts.landingPageUuids === undefined
      ? derived
      : derived.filter((p) => opts.landingPageUuids!.includes(p.uuid));
  const exportedUrns = pages.map((p) => landingPageUrn(p.uuid));

  const widgetRows = await opts.pool.query<{
    uuid: string;
    type: string;
    name: string;
    settings: Record<string, unknown> | null;
  }>(
    `SELECT wi.uuid::text AS uuid, wi.type, wi.name, wi.settings
     FROM widget_instance wi
     WHERE wi.theme IS NOT DISTINCT FROM $1 AND wi.status = TRUE
       -- Keep an instance when it is placed at route level, or inside a
       -- landing page this export includes. An instance that only lives in a
       -- page we are NOT exporting (a merchant's page, a homepage backup, a
       -- page the author deselected) belongs to that page, not to the theme.
       AND (
         EXISTS (SELECT 1 FROM widget_placement p
                  WHERE p.widget_instance_id = wi.widget_instance_id
                    AND p.theme IS NOT DISTINCT FROM $1
                    AND p.entity_urn IS NULL)
         OR EXISTS (SELECT 1 FROM widget_placement p
                     WHERE p.widget_instance_id = wi.widget_instance_id
                       AND p.theme IS NOT DISTINCT FROM $1
                       AND p.entity_urn = ANY($2::text[]))
       )
     ORDER BY wi.uuid`,
    [opts.themeId, exportedUrns]
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
       -- Route-level only. Entity-scoped rows are page content: the ones that
       -- belong to an exported page are written under it (below), and every
       -- other one — a merchant's page, a homepage backup — is left out. The
       -- manifest cannot carry entity_urn, so exporting them at top level
       -- would render them on every landing page of the installing store.
       AND p.entity_urn IS NULL
     ORDER BY p.uuid`,
    [opts.themeId]
  );

  // Bodies of the exported pages, grouped by page.
  const bodyRows =
    exportedUrns.length === 0
      ? { rows: [] as Array<LandingPagePlacementRecord & { entity_urn: string }> }
      : await opts.pool.query<
          LandingPagePlacementRecord & { entity_urn: string }
        >(
          `SELECT p.uuid::text AS uuid, wi.uuid::text AS widget_instance_uuid,
                  p.area, p.sort_order, p.entity_urn
             FROM widget_placement p
             INNER JOIN widget_instance wi ON wi.widget_instance_id = p.widget_instance_id
            WHERE p.theme IS NOT DISTINCT FROM $1
              AND wi.status = TRUE
              AND p.entity_urn = ANY($2::text[])
            ORDER BY p.sort_order, p.uuid`,
          [opts.themeId, exportedUrns]
        );
  const bodyByUrn = new Map<string, LandingPagePlacementRecord[]>();
  for (const r of bodyRows.rows) {
    const list = bodyByUrn.get(r.entity_urn) ?? [];
    list.push({
      uuid: r.uuid,
      widget_instance_uuid: r.widget_instance_uuid,
      area: r.area,
      sort_order: Number(r.sort_order)
    });
    bodyByUrn.set(r.entity_urn, list);
  }
  // `url_key` is deliberately NOT exported: it is generated per store from the
  // page name, so a theme never dictates a URL.
  const landingPages: LandingPageRecord[] = pages.map((p) => ({
    uuid: p.uuid,
    name: p.name,
    description: p.description,
    meta_title: p.meta_title,
    meta_description: p.meta_description,
    status: p.status === true,
    placements: bodyByUrn.get(landingPageUrn(p.uuid)) ?? []
  }));

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

  // Metafield definitions this theme provisioned — manifest-declared AND
  // lazily created via the page-builder drawer (exporting both keeps the next
  // merchant's install from missing fields the theme renders). Keyed by
  // provenance, not namespace: namespaces are a convention, provenance is the
  // mechanism. Guarded for unmigrated DBs.
  const metafieldDefinitions: ManifestMetafieldDefinition[] = [];
  if (await provisioningAvailable(opts.pool)) {
    const defRows = await opts.pool.query(
      `SELECT d.*
         FROM metafield_definition d
        WHERE d.provisioned_by_theme = $1
        ORDER BY d.owner_type, d.namespace, d.field_key`,
      [opts.themeId]
    );
    for (const r of defRows.rows) {
      // The admin REST surface accepts unconstrained validations/subFields;
      // sanitize to the strict manifest shape so the exported theme.json can
      // never fail its own validation and block activation. Definitions that
      // cannot be expressed in the manifest schema are skipped.
      const entry = sanitizeForManifest(rowToDefinition(r));
      if (entry) metafieldDefinitions.push(entry);
    }
  }

  return {
    theme_name: opts.preserveThemeName ?? opts.themeId,
    version: opts.version,
    widgets,
    placements,
    ...(landingPages.length > 0 ? { landingPages } : {}),
    ...(metafieldDefinitions.length > 0 ? { metafieldDefinitions } : {})
  };
}

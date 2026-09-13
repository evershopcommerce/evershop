import type { Pool } from 'pg';
import { rowToDefinition } from '../metafield/definition.js';
import {
  provisioningAvailable,
  sanitizeForManifest
} from '../metafield/provision.js';
import type { ManifestMetafieldDefinition } from '../metafield/provision.js';
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
  const widgetRows = await opts.pool.query<{
    uuid: string;
    type: string;
    name: string;
    settings: Record<string, unknown> | null;
  }>(
    `SELECT wi.uuid::text AS uuid, wi.type, wi.name, wi.settings
     FROM widget_instance wi
     WHERE wi.theme IS NOT DISTINCT FROM $1 AND wi.status = TRUE
       -- An instance whose only placements live inside a landing page body
       -- (entity_urn set) belongs to that page, not to the theme.
       AND NOT (
         EXISTS (SELECT 1 FROM widget_placement p
                  WHERE p.widget_instance_id = wi.widget_instance_id AND p.entity_urn IS NOT NULL)
         AND NOT EXISTS (SELECT 1 FROM widget_placement p
                          WHERE p.widget_instance_id = wi.widget_instance_id AND p.entity_urn IS NULL)
       )
     ORDER BY wi.uuid`,
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
       -- Route-level only: entity-scoped placements (landing page bodies,
       -- homepage backups) are page content, and the manifest cannot carry
       -- entity_urn — exporting them would render them on every landing page
       -- of the installing store.
       AND p.entity_urn IS NULL
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
    ...(metafieldDefinitions.length > 0 ? { metafieldDefinitions } : {})
  };
}

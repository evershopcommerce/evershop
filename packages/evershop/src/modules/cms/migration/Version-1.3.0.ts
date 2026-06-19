import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Phase 2 — Widget table refactor.
 *
 * - Renames `widget` → `widget_instance` and `widget_id` → `widget_instance_id`.
 * - Creates `widget_placement` with one row per (widget_instance, route, area)
 *   cell, including a nullable `entity_urn` for entity-level CMS-page placements.
 * - Backfills placements from the cross-product of `widget.route` × `widget.area`
 *   JSONB arrays (preserving the existing render semantics).
 * - Drops `route`, `area`, `sort_order` from `widget_instance` once placements
 *   are populated.
 *
 * Container children: there is no parent FK on `widget_instance`. Child widgets
 * are stored as regular `widget_placement` rows whose `area` follows the
 * synthetic convention `columnsContainer_<parent_uuid>_col_<index>` — the
 * `Columns` storefront widget emits matching `<Area>` elements at render time,
 * so children attach via the standard Area mechanism with no recursive loader.
 * (Earlier iterations of this branch shipped a `parent_widget_instance_id` FK
 * + a 1.4.0 cleanup migration; consolidated here before commit. See
 * `02-widget-refactor-technical-specification.md` § 7.2 step 5.)
 *
 * The migration runner wraps the whole script in a transaction, so a partial
 * failure rolls back cleanly. See `bin/lib/bootstrap/migrate.js`.
 */
export default async (connection: PoolClient): Promise<void> => {
  // Step 1 — Rename table and primary-key column.
  await execute(connection, `ALTER TABLE widget RENAME TO widget_instance`);
  await execute(
    connection,
    `ALTER TABLE widget_instance RENAME COLUMN widget_id TO widget_instance_id`
  );
  await execute(
    connection,
    `ALTER INDEX widget_pkey RENAME TO widget_instance_pkey`
  );
  await execute(
    connection,
    `ALTER TABLE widget_instance RENAME CONSTRAINT "WIDGET_UUID" TO "WIDGET_INSTANCE_UUID"`
  );

  // Step 2 — Create widget_placement table.
  await execute(
    connection,
    `CREATE TABLE widget_placement (
      widget_placement_id INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
      uuid UUID NOT NULL DEFAULT gen_random_uuid(),
      widget_instance_id INT NOT NULL REFERENCES widget_instance(widget_instance_id) ON DELETE CASCADE,
      route VARCHAR(255) NOT NULL,
      area VARCHAR(255) NOT NULL,
      -- REAL (float) instead of INT so we can insert between two adjacent
      -- widgets via midpoint arithmetic ((A + B) / 2) without reshuffling
      -- everything around them. The page-builder palette and reorder paths
      -- both rely on this.
      sort_order REAL NOT NULL DEFAULT 1,
      entity_urn VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT widget_placement_uuid_key UNIQUE (uuid)
    )`
  );
  await execute(
    connection,
    `CREATE INDEX idx_widget_placement_route_area ON widget_placement(route, area)`
  );
  await execute(
    connection,
    `CREATE INDEX idx_widget_placement_widget_instance_id ON widget_placement(widget_instance_id)`
  );
  await execute(
    connection,
    `CREATE INDEX idx_widget_placement_entity_urn ON widget_placement(entity_urn) WHERE entity_urn IS NOT NULL`
  );
  // Unique constraint that treats NULL entity_urn as equal (Postgres 14 compat).
  // A route-only placement (entity_urn IS NULL) can't duplicate (widget, route, area).
  // Two entity-specific placements with different entity_urn values can coexist.
  await execute(
    connection,
    `CREATE UNIQUE INDEX widget_placement_unique
       ON widget_placement(widget_instance_id, route, area, COALESCE(entity_urn, ''))`
  );

  // Step 3 — Backfill placements from the cross-product of route × area.
  // Widgets with empty route or area arrays produce zero placements (correct —
  // they were inert in the old schema too).
  await execute(
    connection,
    `INSERT INTO widget_placement (widget_instance_id, route, area, sort_order)
     SELECT
       wi.widget_instance_id,
       r.value::text AS route,
       a.value::text AS area,
       wi.sort_order
     FROM widget_instance wi
     CROSS JOIN LATERAL jsonb_array_elements_text(wi.route) AS r(value)
     CROSS JOIN LATERAL jsonb_array_elements_text(wi.area) AS a(value)`
  );

  // Step 4 — Drop the now-redundant columns from widget_instance.
  await execute(connection, `ALTER TABLE widget_instance DROP COLUMN route`);
  await execute(connection, `ALTER TABLE widget_instance DROP COLUMN area`);
  await execute(
    connection,
    `ALTER TABLE widget_instance DROP COLUMN sort_order`
  );
};

import { randomUUID } from 'node:crypto';
import { getDb } from './db.js';

/**
 * Test-only DB queries for the page-builder changeset model. Centralised so
 * specs don't reach into raw SQL inline — keeps cleanup + lookup logic
 * consistent across the suite.
 */

/**
 * Create an open changeset tagged for a specific theme, directly via SQL.
 *
 * The e2e dev server runs with `config.system.theme = null`, so the editor
 * can only ever mint NULL-themed drafts. To exercise the theme-scoped write
 * paths (stamping, cross-theme rejection, publish, rollout inheritance) we
 * seed a changeset with an explicit `theme` here, then drive the REST API
 * against it. Named `e2e-*` (not `pb-draft-*`) so it sits outside the
 * draft-scoped unique index and is swept by `discardAdminChangesets`.
 */
export async function insertThemedChangeset(params: {
  adminUserId: number;
  theme: string | null;
  name?: string;
}): Promise<{ changesetId: number; token: string; uuid: string }> {
  const db = getDb();
  const token = randomUUID();
  const uuid = randomUUID();
  const name = params.name ?? `e2e-themed-cs-${randomUUID().slice(0, 8)}`;
  const { rows } = await db.query<{ changeset_id: number }>(
    `INSERT INTO changeset (name, route_cursors, token, uuid, created_by, theme)
     VALUES ($1, '{}'::jsonb, $2, $3, $4, $5)
     RETURNING changeset_id`,
    [name, token, uuid, params.adminUserId, params.theme]
  );
  return { changesetId: rows[0].changeset_id, token, uuid };
}

export async function readChangesetTheme(
  changesetId: number
): Promise<string | null> {
  const db = getDb();
  const { rows } = await db.query<{ theme: string | null }>(
    `SELECT theme FROM changeset WHERE changeset_id = $1`,
    [changesetId]
  );
  return rows[0]?.theme ?? null;
}

export async function readRolloutPlanTheme(
  rolloutPlanId: number
): Promise<string | null> {
  const db = getDb();
  const { rows } = await db.query<{ theme: string | null }>(
    `SELECT theme FROM rollout_plan WHERE rollout_plan_id = $1`,
    [rolloutPlanId]
  );
  return rows[0]?.theme ?? null;
}

export async function readWidgetInstanceTheme(
  uuid: string
): Promise<string | null | undefined> {
  const db = getDb();
  const { rows } = await db.query<{ theme: string | null }>(
    `SELECT theme FROM widget_instance WHERE uuid = $1`,
    [uuid]
  );
  return rows.length === 0 ? undefined : (rows[0].theme ?? null);
}

export async function readWidgetPlacementTheme(
  uuid: string
): Promise<string | null | undefined> {
  const db = getDb();
  const { rows } = await db.query<{ theme: string | null }>(
    `SELECT theme FROM widget_placement WHERE uuid = $1`,
    [uuid]
  );
  return rows.length === 0 ? undefined : (rows[0].theme ?? null);
}

/**
 * Read the `theme` stamped on the newest INSERT op for a given entity-URN
 * prefix in a changeset. Used to assert the server stamps `changeset.theme`
 * onto `new_payload` (and overrides any client-supplied value).
 */
export async function readOpNewPayloadTheme(
  changesetId: number,
  urnPrefix: string
): Promise<unknown> {
  const db = getDb();
  const { rows } = await db.query<{ new_payload: any }>(
    `SELECT new_payload FROM changeset_operation
     WHERE changeset_id = $1
       AND entity_urn LIKE $2
       AND new_payload IS NOT NULL
     ORDER BY change_order DESC
     LIMIT 1`,
    [changesetId, `${urnPrefix}%`]
  );
  return (rows[0]?.new_payload as any)?.theme;
}

/**
 * Most recent un-published changeset for the given admin user. Returns
 * null if they haven't opened the editor yet. The page-builder edit
 * route calls `getOrCreateDraftChangeset` on open, so once the test
 * navigates to /admin/page-builder/edit/<route> this is guaranteed to
 * resolve.
 */
export async function getActiveChangesetId(
  adminUserId: number
): Promise<number | null> {
  const db = getDb();
  const result = await db.query<{ changeset_id: number }>(
    `SELECT changeset_id FROM changeset
     WHERE created_by = $1 AND published_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [adminUserId]
  );
  return result.rows[0]?.changeset_id ?? null;
}

/**
 * Count operations in a changeset. Useful for asserting that a UI
 * action did (or did not) emit an op.
 */
export async function countOperations(changesetId: number): Promise<number> {
  const db = getDb();
  const result = await db.query<{ c: string }>(
    `SELECT COUNT(*) AS c FROM changeset_operation WHERE changeset_id = $1`,
    [changesetId]
  );
  return Number(result.rows[0]?.c ?? 0);
}

/**
 * Return placement-op rows in the changeset for a given widget instance
 * uuid. Useful for asserting "this widget has a placement at route='all'
 * after drop to global area".
 */
export async function placementsForWidget(
  changesetId: number,
  widgetInstanceUuid: string
): Promise<
  Array<{
    placementUuid: string;
    route: string;
    area: string;
    sortOrder: number;
  }>
> {
  const db = getDb();
  const result = await db.query<{ new_payload: any }>(
    `SELECT new_payload FROM changeset_operation
     WHERE changeset_id = $1
       AND entity_urn LIKE 'urn:evershop:cms:widget_placement:%'
       AND new_payload IS NOT NULL
     ORDER BY change_order`,
    [changesetId]
  );
  return result.rows
    .map((row) => row.new_payload as any)
    .filter((p) => p?.widget_instance_uuid === widgetInstanceUuid)
    .map((p) => ({
      placementUuid: p.uuid as string,
      route: p.route as string,
      area: p.area as string,
      sortOrder: Number(p.sort_order ?? 0)
    }));
}

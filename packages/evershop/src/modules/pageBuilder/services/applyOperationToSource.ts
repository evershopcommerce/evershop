import {
  del,
  insert,
  PoolClient,
  select,
  update
} from '@evershop/postgres-query-builder';
import { UrnService } from '../../../lib/urn/index.js';
import type { ChangesetOperationRow } from '../../../types/db/index.js';

/**
 * Apply a single changeset operation to the **source tables**. Used by the
 * publish path (transactional, irreversible). The on-the-fly rollout overlay
 * uses a separate in-memory walker (see `applyOverlayToWidgets.ts`).
 *
 * Op-type inference from `(old_payload, new_payload)`:
 *   (null, set)  → INSERT
 *   (set, set)   → UPDATE
 *   (set, null)  → DELETE
 *
 * Payloads can carry `*_uuid` references to other entities; this function
 * resolves them to integer FKs at apply time so the changeset never has to
 * track auto-increment IDs.
 */

export type OpType = 'INSERT' | 'UPDATE' | 'DELETE';

export function inferOpType(
  oldPayload: unknown,
  newPayload: unknown
): OpType {
  if (oldPayload == null && newPayload == null) {
    throw new Error(
      'Invalid changeset operation: both old_payload and new_payload are null'
    );
  }
  if (oldPayload == null) return 'INSERT';
  if (newPayload == null) return 'DELETE';
  return 'UPDATE';
}

async function resolveWidgetInstanceIdByUuid(
  uuid: string,
  conn: PoolClient
): Promise<number | null> {
  const row = await select('widget_instance_id')
    .from('widget_instance')
    .where('uuid', '=', uuid)
    .load(conn);
  return row ? Number((row as any).widget_instance_id) : null;
}

/**
 * Defence in depth for the publish path (spec 04 § 9.9). The REST endpoint
 * (`addChangesetOperation`) already rejects cross-theme UPDATE/DELETE ops,
 * but a changeset can hold a *stale* op whose target row was retagged to
 * another theme after the op was recorded. Re-verify at apply time; a
 * mismatch throws so the publish transaction rolls back atomically.
 */
async function assertRowThemeMatches(
  table: 'widget_instance' | 'widget_placement',
  uuid: string,
  changesetTheme: string | null,
  conn: PoolClient
): Promise<void> {
  const row = await select('theme')
    .from(table)
    .where('uuid', '=', uuid)
    .load(conn);
  if (row && (((row as any).theme ?? null) as string | null) !== changesetTheme) {
    throw new Error(
      `theme scope violation on publish: ${table} '${uuid}' has theme ` +
        `'${(row as any).theme ?? null}' but changeset theme is ` +
        `'${changesetTheme}'`
    );
  }
}

async function applyWidgetInstanceOp(
  opType: OpType,
  uuid: string,
  op: ChangesetOperationRow,
  conn: PoolClient,
  changesetTheme: string | null
): Promise<void> {
  if (opType === 'INSERT') {
    const payload: any = { ...(op.new_payload as any) };
    payload.uuid = uuid;
    // Theme is authoritative from the changeset — stamp it (covers legacy
    // ops recorded before server-side stamping landed).
    payload.theme = changesetTheme;
    await insert('widget_instance').given(payload).execute(conn);
    return;
  }
  if (opType === 'UPDATE') {
    await assertRowThemeMatches('widget_instance', uuid, changesetTheme, conn);
    const payload: any = { ...(op.new_payload as any) };
    delete payload.uuid;
    // Theme is immutable per row — never let an UPDATE op rewrite it.
    delete payload.theme;
    await update('widget_instance')
      .given(payload)
      .where('uuid', '=', uuid)
      .execute(conn);
    return;
  }
  // DELETE
  await assertRowThemeMatches('widget_instance', uuid, changesetTheme, conn);
  await del('widget_instance').where('uuid', '=', uuid).execute(conn);
}

async function applyWidgetPlacementOp(
  opType: OpType,
  uuid: string,
  op: ChangesetOperationRow,
  conn: PoolClient,
  changesetTheme: string | null
): Promise<void> {
  if (opType === 'INSERT') {
    const payload: any = { ...(op.new_payload as any) };
    payload.uuid = uuid;
    payload.theme = changesetTheme;
    if (payload.widget_instance_uuid) {
      const wid = await resolveWidgetInstanceIdByUuid(
        payload.widget_instance_uuid,
        conn
      );
      if (wid == null) {
        throw new Error(
          `Cannot insert widget_placement: widget_instance with uuid "${payload.widget_instance_uuid}" not found`
        );
      }
      payload.widget_instance_id = wid;
      delete payload.widget_instance_uuid;
    }
    // Defensive idempotency: if a placement with the same identity tuple
    // (widget_instance_id, route, area, entity_urn) already exists, treat
    // the INSERT as a no-op. The unique index uses COALESCE(entity_urn, '')
    // so we mirror that here. This protects against toggle-on / toggle-off
    // / toggle-on histories where the changeset accumulated multiple
    // INSERT ops for the same target before they could be deduplicated.
    const existsResult = await conn.query(
      `SELECT 1 FROM widget_placement
         WHERE widget_instance_id = $1
           AND route = $2
           AND area = $3
           AND COALESCE(entity_urn, '') = COALESCE($4, '')
         LIMIT 1`,
      [
        payload.widget_instance_id,
        payload.route,
        payload.area,
        payload.entity_urn ?? null
      ]
    );
    if (existsResult.rows.length > 0) return;
    await insert('widget_placement').given(payload).execute(conn);
    return;
  }
  if (opType === 'UPDATE') {
    await assertRowThemeMatches('widget_placement', uuid, changesetTheme, conn);
    const payload: any = { ...(op.new_payload as any) };
    delete payload.uuid;
    delete payload.theme;
    if (Object.prototype.hasOwnProperty.call(payload, 'widget_instance_uuid')) {
      const wid = await resolveWidgetInstanceIdByUuid(
        payload.widget_instance_uuid,
        conn
      );
      payload.widget_instance_id = wid;
      delete payload.widget_instance_uuid;
    }
    await update('widget_placement')
      .given(payload)
      .where('uuid', '=', uuid)
      .execute(conn);
    return;
  }
  // DELETE
  await assertRowThemeMatches('widget_placement', uuid, changesetTheme, conn);
  await del('widget_placement').where('uuid', '=', uuid).execute(conn);
}

/**
 * Apply one operation to the source tables. Throws if the operation targets
 * an unsupported URN type (only `cms:widget_instance` and `cms:widget_placement`
 * are supported in Phase 3a).
 *
 * `changesetTheme` is the publishing changeset's theme: it is stamped onto
 * inserted rows and verified against the target of UPDATE/DELETE ops
 * (spec 04 § 9.9).
 */
export async function applyOperationToSource(
  op: ChangesetOperationRow,
  conn: PoolClient,
  changesetTheme: string | null
): Promise<void> {
  const parts = UrnService.parse(op.entity_urn);
  const opType = inferOpType(op.old_payload, op.new_payload);

  if (parts.service === 'cms' && parts.type === 'widget_instance') {
    return applyWidgetInstanceOp(opType, parts.uuid, op, conn, changesetTheme);
  }
  if (parts.service === 'cms' && parts.type === 'widget_placement') {
    return applyWidgetPlacementOp(opType, parts.uuid, op, conn, changesetTheme);
  }
  throw new Error(
    `Unsupported changeset op target: ${parts.service}:${parts.type}. ` +
      `Phase 3a only supports cms:widget_instance and cms:widget_placement.`
  );
}

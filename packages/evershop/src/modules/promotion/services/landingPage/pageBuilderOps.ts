import type { Pool, PoolClient } from 'pg';

/**
 * SQL over the page-builder tables (`changeset`, `changeset_operation`,
 * `rollout_plan`) needed by "Replace homepage". Lives in promotion so the
 * page builder itself stays untouched. See
 * specifications/replace-homepage-with-landing-page.md §2, §6, §7.
 */

type Queryable = Pool | PoolClient;

/** What an operation must touch to count as "touching" a page. */
export interface TargetSpec {
  /** Ops stamped with this editor route count (e.g. `'homepage'`). `null` = do not match on the stamp. */
  route: string | null;
  /** INSERT placement ops scoped to this entity count (e.g. a landing page URN). */
  entityUrn: string | null;
  /** Existing placement uuids of the page body. */
  placementUuids: string[];
  /** Existing instance uuids of the page body. */
  instanceUuids: string[];
}

export const PLACEMENT_URN_PREFIX = 'urn:evershop:cms:widget_placement:';
export const INSTANCE_URN_PREFIX = 'urn:evershop:cms:widget_instance:';

/**
 * Build the `<op touches target>` predicate for an alias, using positional
 * parameters starting at `startIndex`. Returns the SQL fragment and the
 * parameters to append, in order. Pure.
 */
export function touchesSql(
  spec: TargetSpec,
  startIndex: number,
  alias = 'op'
): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const next = () => `$${startIndex + params.length}`;
  if (spec.route !== null) {
    params.push(spec.route);
    const p = next();
    clauses.push(`${alias}.route = $${startIndex + params.length - 1}`);
    clauses.push(
      `(${alias}.old_payload IS NULL AND ${alias}.new_payload->>'route' = $${startIndex + params.length - 1})`
    );
    void p;
  }
  params.push(spec.placementUuids.map((u) => PLACEMENT_URN_PREFIX + u));
  clauses.push(`${alias}.entity_urn = ANY($${startIndex + params.length - 1}::text[])`);
  params.push(spec.instanceUuids.map((u) => INSTANCE_URN_PREFIX + u));
  clauses.push(`${alias}.entity_urn = ANY($${startIndex + params.length - 1}::text[])`);
  params.push(spec.instanceUuids);
  clauses.push(
    `(${alias}.old_payload IS NULL AND ${alias}.new_payload->>'widget_instance_uuid' = ANY($${startIndex + params.length - 1}::text[]))`
  );
  if (spec.entityUrn !== null) {
    params.push(spec.entityUrn);
    clauses.push(
      `(${alias}.old_payload IS NULL AND ${alias}.new_payload->>'entity_urn' = $${startIndex + params.length - 1})`
    );
  }
  return { sql: `(${clauses.join(' OR ')})`, params };
}

export interface RolloutPlanRef {
  rollout_plan_id: number;
  uuid: string;
  name: string;
  start_time: Date;
  end_time: Date | null;
}

export type PlanStatus = 'active' | 'upcoming' | 'past';

/** active = started and not ended; upcoming = not started; past = ended. Pure. */
export function classifyPlan(
  plan: { start_time: Date | string; end_time: Date | string | null },
  now: Date
): PlanStatus {
  const start = new Date(plan.start_time).getTime();
  const end = plan.end_time === null ? null : new Date(plan.end_time).getTime();
  if (end !== null && end <= now.getTime()) return 'past';
  if (start <= now.getTime()) return 'active';
  return 'upcoming';
}

/** A personal draft is named `pb-draft-<userId>`; anything else unpublished and unattached is a detached rollout changeset. Pure. */
export function changesetKind(name: string): 'draft' | 'detachedRollout' {
  return name.startsWith('pb-draft-') ? 'draft' : 'detachedRollout';
}

export interface PlansTouching {
  active: RolloutPlanRef[];
  upcoming: RolloutPlanRef[];
  past: RolloutPlanRef[];
}

/** Every plan in the theme bucket whose changeset has ≥ 1 op touching the target, split by status. */
export async function findRolloutPlansTouching(
  q: Queryable,
  theme: string | null,
  spec: TargetSpec,
  now: Date = new Date()
): Promise<PlansTouching> {
  const pred = touchesSql(spec, 2);
  const res = await q.query<RolloutPlanRef>(
    `SELECT rp.rollout_plan_id, rp.uuid::text AS uuid, rp.name, rp.start_time, rp.end_time
       FROM rollout_plan rp
      WHERE rp.theme IS NOT DISTINCT FROM $1
        AND EXISTS (SELECT 1 FROM changeset_operation op
                     WHERE op.changeset_id = rp.changeset_id AND ${pred.sql})
      ORDER BY rp.start_time ASC`,
    [theme, ...pred.params]
  );
  const out: PlansTouching = { active: [], upcoming: [], past: [] };
  for (const row of res.rows) out[classifyPlan(row, now)].push(row);
  return out;
}

/** Delete plan rows only (the changeset is kept), exactly like `cancelRolloutPlan`. */
export async function cancelPlans(
  conn: PoolClient,
  planIds: number[]
): Promise<number> {
  if (planIds.length === 0) return 0;
  const res = await conn.query(
    'DELETE FROM rollout_plan WHERE rollout_plan_id = ANY($1::int[])',
    [planIds]
  );
  return res.rowCount ?? 0;
}

export interface ChangesetTouching {
  changeset_id: number;
  name: string;
  created_by: number;
  kind: 'draft' | 'detachedRollout';
  operationCount: number;
}

/**
 * Unpublished changesets in the theme bucket, not attached to any plan, with
 * ≥ 1 op touching the target. `lock` takes `FOR UPDATE` on the changeset rows
 * (the `addChangesetOperation` idiom) so concurrent auto-saves serialise.
 */
export async function findChangesetsTouching(
  q: Queryable,
  theme: string | null,
  spec: TargetSpec,
  lock = false
): Promise<ChangesetTouching[]> {
  const pred = touchesSql(spec, 2);
  const rows = await q.query<{ changeset_id: number; name: string; created_by: number }>(
    `SELECT cs.changeset_id, cs.name, cs.created_by
       FROM changeset cs
      WHERE cs.published_at IS NULL
        AND cs.theme IS NOT DISTINCT FROM $1
        AND NOT EXISTS (SELECT 1 FROM rollout_plan rp WHERE rp.changeset_id = cs.changeset_id)
        AND EXISTS (SELECT 1 FROM changeset_operation op
                     WHERE op.changeset_id = cs.changeset_id AND ${pred.sql})
      ORDER BY cs.changeset_id${lock ? ' FOR UPDATE OF cs' : ''}`,
    [theme, ...pred.params]
  );
  const out: ChangesetTouching[] = [];
  for (const cs of rows.rows) {
    const countPred = touchesSql(spec, 2);
    const count = await q.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM changeset_operation op
        WHERE op.changeset_id = $1 AND ${countPred.sql}`,
      [cs.changeset_id, ...countPred.params]
    );
    out.push({
      changeset_id: cs.changeset_id,
      name: cs.name,
      created_by: cs.created_by,
      kind: changesetKind(cs.name),
      operationCount: Number(count.rows[0]?.n ?? 0)
    });
  }
  return out;
}

/**
 * Delete the ops of one changeset that touch the target, then drop the
 * `homepage` cursor key. The row itself is never deleted (an emptied draft is
 * reused by `getOrCreateDraftChangeset`; deleting it would 404 every save in
 * an open editor tab). Both predicates are repeated inside the statements.
 */
export async function discardOperationsTouching(
  conn: PoolClient,
  changesetId: number,
  spec: TargetSpec,
  cursorKey = 'homepage'
): Promise<number> {
  const pred = touchesSql(spec, 2);
  const del = await conn.query(
    `DELETE FROM changeset_operation op
      WHERE op.changeset_id = $1 AND ${pred.sql}
        AND EXISTS (SELECT 1 FROM changeset cs
                     WHERE cs.changeset_id = op.changeset_id AND cs.published_at IS NULL
                       AND NOT EXISTS (SELECT 1 FROM rollout_plan rp WHERE rp.changeset_id = cs.changeset_id))`,
    [changesetId, ...pred.params]
  );
  await conn.query(
    `UPDATE changeset
        SET route_cursors = route_cursors - $2::text, updated_at = NOW()
      WHERE changeset_id = $1 AND published_at IS NULL`,
    [changesetId, cursorKey]
  );
  return del.rowCount ?? 0;
}

import {
  commit,
  del,
  rollback,
  select,
  startTransaction,
  update
} from '@evershop/postgres-query-builder';
import { getConnection } from '../../../lib/postgres/connection.js';
import type { ChangesetOperationRow } from '../../../types/db/index.js';
import { applyOperationToSource } from './applyOperationToSource.js';

/**
 * Publish a changeset transactionally. Walks operations in `change_order`
 * ascending and applies each to source tables. Sets `published_at` on
 * success. Throws (and rolls back) on any error.
 *
 * Per spec 03 § 6.1, after successful publish the changeset is preserved
 * in the DB with `published_at` set — never deleted — for audit.
 */
export async function publishChangeset(changesetId: number): Promise<void> {
  const conn = await getConnection();
  await startTransaction(conn);
  try {
    const changeset = await select()
      .from('changeset')
      .where('changeset_id', '=', changesetId)
      .load(conn);
    if (!changeset) {
      throw new Error(`Changeset ${changesetId} not found`);
    }
    if ((changeset as any).published_at) {
      throw new Error(
        `Changeset ${changesetId} is already published (published_at=${
          (changeset as any).published_at
        })`
      );
    }

    // Per-route undo/redo (spec § 5.1, § 5.4). `route_cursors` is the
    // authoritative map of "highest applied change_order per route". An op
    // is in the applied region iff `op.change_order <= route_cursors[op.route]`
    // (default 0 when absent). Ops past their route's cursor are part of
    // that route's redo stack and don't publish.
    const opsResult = await conn.query(
      `SELECT op.*
       FROM changeset_operation op
       INNER JOIN changeset cs ON cs.changeset_id = op.changeset_id
       WHERE cs.changeset_id = $1
         AND op.change_order <= COALESCE((cs.route_cursors ->> op.route)::int, 0)
       ORDER BY op.change_order ASC`,
      [changesetId]
    );
    const ops = opsResult.rows as ChangesetOperationRow[];

    // The changeset's theme is stamped onto inserted source rows and used to
    // reject UPDATE/DELETE ops whose target was retagged to another theme
    // (spec 04 § 9.9). A violation throws below and rolls back the publish.
    const changesetTheme = ((changeset as any).theme ?? null) as string | null;
    for (const op of ops) {
      await applyOperationToSource(op, conn, changesetTheme);
    }

    await update('changeset')
      .given({ published_at: new Date() })
      .where('changeset_id', '=', changesetId)
      .execute(conn);

    // Any rollout_plan rows that point at this changeset are now stale —
    // their ops were just baked into source tables, so the overlay would be
    // a no-op (or a confusing duplicate) and the rollout can't be edited
    // again (its changeset is published). Delete them inside the same
    // transaction so the publish is atomic. Without this step the page
    // handler later falls back to draft when the user tries to edit the
    // rollout, with no clear feedback about why.
    await del('rollout_plan')
      .where('changeset_id', '=', changesetId)
      .execute(conn);

    await commit(conn);
  } catch (e) {
    await rollback(conn);
    throw e;
  }
}

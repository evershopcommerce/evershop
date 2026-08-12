import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Enforce a single change_order per changeset at the schema level.
 *
 * `addChangesetOperation` allocates `change_order = MAX(change_order) + 1`.
 * Before the accompanying `SELECT … FOR UPDATE` row lock, two concurrent adds
 * on the same changeset (two editor tabs, or the client's parallel auto-save
 * POSTs) could both read the same MAX and insert a duplicate `change_order`,
 * breaking the "globally monotonic timeline" invariant the publish/undo paths
 * rely on. The row lock now serializes those writers; this unique index is the
 * belt-and-suspenders guarantee — a residual duplicate becomes a hard error
 * instead of silent history corruption.
 *
 * Defensive DROP first in case a previous migration attempt left a stale
 * index.
 *
 * Existing databases need a repair step before the index can build: any DB
 * that took page-builder writes under the pre-lock build can already hold
 * duplicate pairs minted by the very race this index closes (two auto-save
 * POSTs microseconds apart, both reading the same MAX — observed in the wild
 * as two ops sharing `old_payload` with divergent `new_payload`). Collapse
 * each duplicate group to its newest row (max `changeset_operation_id`):
 * last write wins, which matches both the state a publish already
 * materialized (equal orders scan in insertion order, so the later
 * `new_payload` overwrote the earlier) and the user's final auto-saved edit.
 *
 * Deliberately dedupe rather than renumber: renumbering would shift every
 * subsequent `change_order` out from under `changeset.route_cursors` and
 * `rollout_plan.route_cursors` (the applied-window pointers), silently
 * corrupting undo/redo windows unless both JSONB maps were remapped in
 * lockstep. Deleting the older twin keeps all surviving orders and cursors
 * valid — the apply/undo paths already tolerate sparse orders, and nothing
 * FK-references `changeset_operation` rows.
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `DROP INDEX IF EXISTS idx_changeset_operation_order_unique`
  );
  await execute(
    connection,
    `DELETE FROM changeset_operation a
     USING changeset_operation b
     WHERE a.changeset_id = b.changeset_id
       AND a.change_order = b.change_order
       AND a.changeset_operation_id < b.changeset_operation_id`
  );
  await execute(
    connection,
    `CREATE UNIQUE INDEX idx_changeset_operation_order_unique
       ON changeset_operation(changeset_id, change_order)`
  );
};

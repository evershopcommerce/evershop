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
 * index. Safe on existing data: the v1 dataset has no duplicate pairs (a
 * pre-existing duplicate would surface here as a clear migration failure to
 * investigate rather than corrupting future publishes).
 */
export default async (connection: PoolClient): Promise<void> => {
  await execute(
    connection,
    `DROP INDEX IF EXISTS idx_changeset_operation_order_unique`
  );
  await execute(
    connection,
    `CREATE UNIQUE INDEX idx_changeset_operation_order_unique
       ON changeset_operation(changeset_id, change_order)`
  );
};

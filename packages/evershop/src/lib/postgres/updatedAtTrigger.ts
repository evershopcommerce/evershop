import { execute } from '@evershop/postgres-query-builder';
import type { PoolClient } from 'pg';

/**
 * Keep a table's `updated_at` current. A BEFORE UPDATE trigger sets it to
 * `now()` (the start time of the transaction) whenever a row is updated,
 * unless the statement sets `updated_at` itself: an import that writes a
 * historical date, or code that sets the value on purpose, keeps its value.
 * Existing rows are not backfilled; each gets the time of its next update.
 *
 * Call it from a migration, core's or an extension's (for its own tables):
 *
 *   await addUpdatedAtTrigger(connection, 'my_table');
 *
 * Safe to run again: the function is replaced and the trigger re-created.
 * The table must have an `updated_at` column, or every later UPDATE on it
 * would fail, so a missing column is an error here, at migration time.
 */
export async function addUpdatedAtTrigger(
  connection: PoolClient,
  table: string
): Promise<void> {
  if (!/^[a-z_][a-z0-9_]*$/.test(table)) {
    throw new Error(`addUpdatedAtTrigger: invalid table name '${table}'`);
  }
  const { rows } = await connection.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = $1
        AND column_name = 'updated_at'`,
    [table]
  );
  if (rows.length === 0) {
    throw new Error(
      `addUpdatedAtTrigger: table '${table}' has no updated_at column`
    );
  }
  await execute(
    connection,
    `CREATE OR REPLACE FUNCTION evershop_set_updated_at() RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
        NEW.updated_at := now();
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  );
  await execute(
    connection,
    `DROP TRIGGER IF EXISTS "SET_UPDATED_AT" ON "${table}";`
  );
  await execute(
    connection,
    `CREATE TRIGGER "SET_UPDATED_AT" BEFORE UPDATE ON "${table}"
    FOR EACH ROW EXECUTE PROCEDURE evershop_set_updated_at();`
  );
}

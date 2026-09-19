import pg from 'pg';

/**
 * Single shared pg Pool for the test suite. Created lazily on first use so
 * tests that don't touch the DB don't pay the connect cost. Closed by
 * globalTeardown.
 *
 * The same DB the dev server uses — per project decision the e2e suite
 * exercises live source-of-truth, not a clone. Tests MUST clean up after
 * themselves (delete inserted rows, drop changeset_operation rows tagged
 * with the test's changeset id).
 */
let pool: pg.Pool | null = null;

export function getDb(): pg.Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env in tests/e2e/.'
    );
  }
  pool = new pg.Pool({ connectionString, max: 4 });
  return pool;
}

export async function closeDb(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = null;
}

/**
 * Hard-delete any leftover e2e widget instances and the placements that
 * reference them. Placements cascade-delete via the FK. Safe to invoke
 * before or after a test run.
 *
 * The convention: every test-created widget has `name` prefixed with
 * `e2e-`. Tests that violate this convention won't be cleaned up here —
 * that's intentional, makes the contract loud.
 */
export async function cleanupTestWidgets(): Promise<void> {
  const db = getDb();
  await db.query(
    `DELETE FROM widget_instance WHERE name LIKE $1`,
    ['e2e-%']
  );
}

/**
 * Same idea for changesets the suite creates. They're named `e2e-<uuid>`.
 * Changeset_operation rows cascade via FK on changeset_id.
 */
export async function cleanupTestChangesets(): Promise<void> {
  const db = getDb();
  await db.query(
    `DELETE FROM changeset WHERE name LIKE $1 AND published_at IS NULL`,
    ['e2e-%']
  );
}

/**
 * Drop all unpublished changesets for the given admin. Used in `beforeEach`
 * to reset the per-route draft so consecutive tests don't see leftover
 * operations from the previous one. Changesets owned by `e2e-` admins are
 * disposable by definition (the admin itself is torn down at the end).
 */
export async function discardAdminChangesets(adminUserId: number): Promise<void> {
  const db = getDb();
  await db.query(
    `DELETE FROM changeset WHERE created_by = $1 AND published_at IS NULL`,
    [adminUserId]
  );
}

/**
 * Hard-delete any leftover e2e rollout plans by name prefix. Also cascades
 * to the test changesets they reference (via FK ON DELETE CASCADE on
 * rollout_plan.changeset_id → changeset.changeset_id) — but only the
 * rollout rows themselves; we delete those first explicitly so the
 * companion changeset survives for changeset-targeted cleanup.
 *
 * Convention: rollout plans created by the suite are named `e2e-…`. Tests
 * that pick a different name won't be cleaned up here.
 */
export async function cleanupTestRolloutPlans(): Promise<void> {
  const db = getDb();
  await db.query(`DELETE FROM rollout_plan WHERE name LIKE $1`, ['e2e-%']);
}

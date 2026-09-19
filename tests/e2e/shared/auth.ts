import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';
import { getDb } from './db.js';

/**
 * Test admin user lifecycle.
 *
 * Email: `e2e-<uuid>@evershop-e2e.invalid`. The `.invalid` TLD is reserved
 * (RFC 2606) so no real outbound mail can be triggered by accident. The
 * `e2e-` prefix is the cleanup hook.
 *
 * Password: 64 hex chars from crypto.randomBytes. Never logged; hashed
 * with bcrypt at the same cost factor EverShop's `lib/util/passwordHelper`
 * uses (cost 10, the bcryptjs default).
 *
 * Stored in a plain file under `tests/e2e/.auth/` so the credentials
 * survive between globalSetup and globalTeardown. The .auth directory is
 * gitignored.
 */

export interface TestAdmin {
  uuid: string;
  email: string;
  password: string;
  adminUserId: number;
}

const BCRYPT_COST = 10;

function generateEmail(): string {
  // UUID v4 — 36 chars, dashes, lowercase. Guarantees uniqueness across
  // parallel test runs and across re-runs that didn't clean up cleanly.
  return `e2e-${randomUUID()}@evershop-e2e.invalid`;
}

function generatePassword(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Insert a fresh admin user. Returns the credentials so a follow-up step
 * can log in with them. The password is **only** returned here — once the
 * function exits the plaintext is unrecoverable from the DB.
 */
export async function createTestAdmin(): Promise<TestAdmin> {
  const email = generateEmail();
  const password = generatePassword();
  const hash = bcrypt.hashSync(password, BCRYPT_COST);

  const db = getDb();
  const result = await db.query<{ admin_user_id: number; uuid: string }>(
    `INSERT INTO admin_user (email, password, full_name, status)
     VALUES ($1, $2, $3, true)
     RETURNING admin_user_id, uuid`,
    [email, hash, 'E2E Test Admin']
  );
  if (result.rows.length === 0) {
    throw new Error('Failed to insert test admin user.');
  }
  return {
    uuid: result.rows[0].uuid,
    email,
    password,
    adminUserId: result.rows[0].admin_user_id
  };
}

/**
 * Hard-delete the test admin user. Also drops any changesets they own —
 * the changeset.created_by FK has no CASCADE, so a leftover changeset
 * blocks the user delete. Called by globalTeardown.
 *
 * Resilient: if the user isn't there (e.g. teardown ran twice), no-op.
 */
export async function deleteTestAdmin(adminUserId: number): Promise<void> {
  const db = getDb();
  await db.query(`DELETE FROM changeset WHERE created_by = $1`, [adminUserId]);
  await db.query(`DELETE FROM admin_user WHERE admin_user_id = $1`, [
    adminUserId
  ]);
}

/**
 * Belt-and-suspenders cleanup: drop ANY lingering `e2e-*@evershop-e2e.invalid`
 * accounts that previous failed runs left behind. Cheap and idempotent.
 */
export async function cleanupOrphanedTestAdmins(): Promise<void> {
  const db = getDb();
  const orphans = await db.query<{ admin_user_id: number }>(
    `SELECT admin_user_id FROM admin_user WHERE email LIKE 'e2e-%@evershop-e2e.invalid'`
  );
  for (const row of orphans.rows) {
    await deleteTestAdmin(row.admin_user_id);
  }
}

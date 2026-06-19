import { request, type FullConfig } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cleanupOrphanedTestAdmins,
  createTestAdmin,
  type TestAdmin
} from './auth.js';
import {
  cleanupTestChangesets,
  cleanupTestWidgets,
  closeDb
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '..', '.auth');
const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'admin.json');
const ADMIN_META_PATH = path.join(AUTH_DIR, 'admin.meta.json');

/**
 * Global setup steps:
 *
 *   1. Sanity-check that BASE_URL is reachable. Fail loud if the dev
 *      server isn't running — tests would time out otherwise with
 *      uninformative errors.
 *   2. Sweep up orphaned `e2e-*` admin users / changesets / widgets from
 *      previous runs that didn't tear down (Ctrl-C, crash, etc.).
 *   3. Create a fresh throw-away admin user.
 *   4. Log them in via `/admin/user/login` and save the resulting
 *      session cookie as Playwright `storageState`. Specs reuse it.
 *   5. Persist the admin's id to `admin.meta.json` so globalTeardown can
 *      target the right user.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    (config.projects[0]?.use as { baseURL?: string } | undefined)?.baseURL ??
    process.env.BASE_URL ??
    'http://localhost:3000';

  // 1. Reachability probe. 5s budget — anything longer means the dev
  // server is rebuilding or hung; we'd rather fail now than wait 30s on
  // each spec's navigation.
  try {
    const probe = await request.newContext({ baseURL });
    const res = await probe.get('/', { timeout: 5000 });
    if (!res.ok()) {
      throw new Error(
        `Dev server at ${baseURL} responded ${res.status()}. Is it ready?`
      );
    }
    await probe.dispose();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[e2e:globalSetup] Cannot reach BASE_URL ${baseURL}.\n` +
        `  → Start the dev server: \`npm run dev\` from the repo root.\n` +
        `  → Original error: ${msg}`
    );
  }

  // 2. Sweep orphans.
  await cleanupOrphanedTestAdmins();
  await cleanupTestChangesets();
  await cleanupTestWidgets();

  // 3 + 4. Create the test admin and log them in.
  mkdirSync(AUTH_DIR, { recursive: true });
  const admin: TestAdmin = await createTestAdmin();

  const ctx = await request.newContext({ baseURL });
  try {
    const loginRes = await ctx.post('/admin/user/login', {
      data: { email: admin.email, password: admin.password },
      headers: { 'Content-Type': 'application/json' }
    });
    if (!loginRes.ok()) {
      const body = await loginRes.text().catch(() => '<no body>');
      throw new Error(
        `Admin login failed: ${loginRes.status()} ${loginRes.statusText()}\n  body: ${body.substring(0, 300)}`
      );
    }
    await ctx.storageState({ path: STORAGE_STATE_PATH });
  } finally {
    await ctx.dispose();
  }

  // 5. Stash the admin id for teardown. The plaintext password is NOT
  // persisted — it's already in the storage state's cookies (encrypted
  // at-rest by the OS keychain on macOS; on CI it's fine to live in
  // .auth which gets shredded on workspace cleanup).
  writeFileSync(
    ADMIN_META_PATH,
    JSON.stringify(
      { adminUserId: admin.adminUserId, email: admin.email },
      null,
      2
    ),
    'utf8'
  );

  // Suite-scoped pool. Specs open their own short-lived ones via getDb().
  // Closing here would force each spec to reconnect — keep it open until
  // globalTeardown.
  // (no-op; pool stays for teardown)
  void closeDb;
}

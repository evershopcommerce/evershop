import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deleteTestAdmin } from './auth.js';
import {
  cleanupTestChangesets,
  cleanupTestRolloutPlans,
  cleanupTestWidgets,
  closeDb
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '..', '.auth');
const ADMIN_META_PATH = path.join(AUTH_DIR, 'admin.meta.json');

/**
 * Best-effort teardown. Each step is wrapped so a failure in one doesn't
 * skip the others — leaving rows behind is the worst outcome here, not a
 * cryptic stack trace.
 *
 *   1. Drop the test admin user (cascade-deletes their changesets).
 *   2. Drop any `e2e-*` widgets the suite forgot to clean up inside its
 *      individual spec teardowns.
 *   3. Drop any draft `e2e-*` changesets.
 *   4. Remove the `.auth` directory so the next run starts fresh.
 *   5. Close the pg pool.
 */
export default async function globalTeardown(): Promise<void> {
  const safeRun = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[e2e:globalTeardown] ${label} failed: ${msg}`);
    }
  };

  if (existsSync(ADMIN_META_PATH)) {
    try {
      const meta = JSON.parse(readFileSync(ADMIN_META_PATH, 'utf8')) as {
        adminUserId?: number;
      };
      if (typeof meta.adminUserId === 'number') {
        await safeRun('deleteTestAdmin', () => deleteTestAdmin(meta.adminUserId!));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[e2e:globalTeardown] could not parse admin.meta.json: ${msg}`
      );
    }
  }

  // Order matters: rollout plans first, then their underlying changesets,
  // then widgets. Each can survive its predecessor's failure thanks to
  // safeRun, but the nominal order is the dependency chain.
  await safeRun('cleanupTestRolloutPlans', cleanupTestRolloutPlans);
  await safeRun('cleanupTestWidgets', cleanupTestWidgets);
  await safeRun('cleanupTestChangesets', cleanupTestChangesets);

  // Wipe stored auth so the next run can't reuse a stale session by
  // accident (it would 401 once the admin is gone, but failing fast at
  // setup time is friendlier than failing mid-spec).
  await safeRun('rm .auth', async () => {
    if (existsSync(AUTH_DIR)) {
      rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  });

  await safeRun('closeDb', closeDb);
}

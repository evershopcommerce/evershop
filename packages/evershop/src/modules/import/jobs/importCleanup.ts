import { maintenanceDeps } from '../dispatch/runtime.js';
import { cleanUpJobs } from '../services/maintenance/maintenance.js';

/**
 * The cleanup cron (§ 8.4, Cleanup): deletes abandoned uploads, jobs past their
 * retention, and the file of a job that ended with nothing to download. Runs
 * every ten minutes, on every instance, and is idempotent.
 */
export default async function importCleanup(): Promise<void> {
  await cleanUpJobs(maintenanceDeps());
}

import { maintenanceDeps } from '../dispatch/runtime.js';
import { recoverDeadJobs } from '../services/maintenance/maintenance.js';

/**
 * The recovery cron (§ 8.4, Heartbeat and recovery): a `validating` or `running`
 * job whose worker has not reported for 2 minutes becomes `interrupted`. Runs
 * every minute, on every instance, and is idempotent.
 */
export default async function importRecover(): Promise<void> {
  await recoverDeadJobs(maintenanceDeps());
}

import { maintenanceDeps } from '../dispatch/runtime.js';
import { dispatchWaitingJobs } from '../services/maintenance/maintenance.js';

/**
 * The dispatch cron (§ 8.4, Who runs it): asks again for a worker for a job that
 * has waited more than 30 seconds in `uploaded` or `queued`. Runs every minute,
 * on every instance; a request that is already on its way is not repeated.
 */
export default async function importDispatch(): Promise<void> {
  await dispatchWaitingJobs(maintenanceDeps());
}

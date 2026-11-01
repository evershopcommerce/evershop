import { pathToFileURL } from 'url';
import { refreshSetting } from '../../modules/setting/services/setting.js';
import type { Job } from '../../types/cronjob.js';
import { error } from '../log/logger.js';

export interface RunJobDeps {
  refreshSettings: () => Promise<void>;
  importJob: (resolve: string) => Promise<{ default?: unknown }>;
  logError: (e: unknown) => void;
}

const defaultDeps: RunJobDeps = {
  refreshSettings: refreshSetting,
  importJob: (resolve) => import(pathToFileURL(resolve).toString()),
  logError: error
};

/**
 * Run one cron job. The cron process keeps its own settings cache, filled
 * once at boot, and `saveSetting` refreshes only the web process that saved
 * the change. So refresh it before every run: a setting an admin changes
 * (the PayPal credentials and environment the reconciliation job calls, the
 * store languages the sitemap lists) reaches the jobs without a restart, as
 * the event process already does before each batch. A failed refresh is
 * logged and keeps the cache it had; the job still runs.
 */
export async function runJob(
  job: Pick<Job, 'name' | 'resolve'>,
  deps: RunJobDeps = defaultDeps
): Promise<void> {
  try {
    await deps.refreshSettings();
  } catch (e) {
    deps.logError(e);
  }
  try {
    const module = await deps.importJob(job.resolve);
    // Make sure the module is a function or async function
    if (typeof module.default !== 'function') {
      throw new Error(
        `Job ${job.name} is not a function. Make sure the module exports a function as default.`
      );
    }
    await module.default();
  } catch (e) {
    deps.logError(e);
  }
}

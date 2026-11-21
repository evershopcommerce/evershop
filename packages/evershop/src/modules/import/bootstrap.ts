import path from 'path';
import { registerJob } from '../../lib/cronjob/jobManager.js';
import { CONSTANTS } from '../../lib/helpers.js';
import { warning } from '../../lib/log/logger.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import { addProcessor } from '../../lib/util/registry.js';
import { registerDefaultImportJobFilters } from './adapters/importJobFilters.js';

/**
 * The three cron jobs under the import (§ 8.4, Who runs it). Every instance
 * runs them; each one is safe to run twice at once.
 */
export const IMPORT_CRON_JOBS = [
  // Asks again for a worker for a job that has waited too long.
  { name: 'importDispatch', schedule: '* * * * *' },
  // Interrupts a job whose worker has stopped reporting.
  { name: 'importRecover', schedule: '* * * * *' },
  // Deletes abandoned uploads, expired jobs and the file of a clean job.
  { name: 'importCleanup', schedule: '*/10 * * * *' }
] as const;

export default (): void => {
  // The list of past imports: its filters and its pages.
  addProcessor(
    'importJobCollectionFilters',
    registerDefaultImportJobFilters,
    1
  );
  addProcessor<Array<any>>(
    'importJobCollectionFilters',
    (filters) => [...filters, ...defaultPaginationFilters],
    2
  );

  // registerJob throws on a bad path or schedule. The cron process ends when a
  // bootstrap throws, so degrade to a skipped job, never a store whose cron
  // jobs all stop.
  for (const job of IMPORT_CRON_JOBS) {
    try {
      registerJob({
        name: job.name,
        schedule: job.schedule,
        resolve: path.resolve(
          CONSTANTS.MODULESPATH,
          `import/jobs/${job.name}.js`
        ),
        enabled: true
      });
    } catch (e) {
      warning(`Skipping ${job.name} job registration: ${(e as Error).message}`);
    }
  }
};

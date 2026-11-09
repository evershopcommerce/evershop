import cron from 'node-cron';
import { headlessBoot } from '../../bin/lib/bootstrap/headlessBoot.js';
import { debug, error } from '../log/logger.js';
import { getEnabledJobs } from './jobManager.js';
import { runJob } from './runJob.js';

async function start() {
  try {
    // Every module's bootstrap (core, then extensions; the setting module's
    // bootstrap warms the settings cache), then the hook, registry and
    // address-registry locks, as the event process boots; then the routes, so
    // jobs can build URLs (`buildUrl`, `buildAbsoluteUrl`). No extra settings
    // load is asked for: runJob.ts refreshes them before each job.
    await headlessBoot({
      context: {
        ...JSON.parse(process.env.bootstrapContext || '{}'),
        process: 'cronjob'
      },
      loadRoutes: true
    });
  } catch (e) {
    error(e);
    process.exit(0);
    return;
  }
  // After the boot: reading the jobs freezes the job manager, and the
  // bootstraps register their jobs
  const jobs = getEnabledJobs();

  // Schedule the jobs. Each run refreshes this process's settings first
  // (runJob.ts).
  jobs.forEach((job) => {
    cron.schedule(job.schedule, () => runJob(job));
  });
}

process.on('SIGTERM', async () => {
  debug('Cron job received SIGTERM, shutting down...');
  try {
    process.exit(0);
  } catch (err) {
    error('Error during shutdown:');
    error(err);
    process.exit(1); // Exit with an error code
  }
});

process.on('SIGINT', async () => {
  debug('Cron job received SIGINT, shutting down...');
  try {
    process.exit(0);
  } catch (err) {
    error('Error during shutdown:');
    error(err);
    process.exit(1); // Exit with an error code
  }
});

start();

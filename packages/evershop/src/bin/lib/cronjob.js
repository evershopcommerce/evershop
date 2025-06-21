import cron from 'node-cron';
import { debug, error } from '../../lib/log/logger.js';
import { getConfig } from '../../lib/util/getConfig.js';

function start() {
  // Get the list of jobs from the configuration
  const jobs = getConfig('system.jobs', []);

  const goodJobs = [];
  jobs.forEach((job) => {
    if (!cron.validate(job.schedule)) {
      error(
        `Job ${job.name} has an invalid schedule. Please check again the 'schedule' property.`
      );
    } else if (job.enabled === true) {
      goodJobs.push(job);
    } else {
      error(`Job ${job.name} is disabled.`);
    }
  });
  // Schedule the jobs
  goodJobs.forEach((job) => {
    cron.schedule(job.schedule, async () => {
      try {
        // Load the module
        const module = await import(job.resolve);
        // Make sure the module is a function or async function
        if (typeof module.default !== 'function') {
          throw new Error(
            `Job ${job.name} is not a function. Make sure the module exports a function as default.`
          );
        }
        // Execute the job
        await module.default();
      } catch (e) {
        error(e);
      }
    });
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

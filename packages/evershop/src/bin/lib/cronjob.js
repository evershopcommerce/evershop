import cron from 'node-cron';
import { getConfig } from '../../lib/util/getConfig.js';
import { error } from '../../lib/log/logger.js';

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

start();

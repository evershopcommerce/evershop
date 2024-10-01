const cron = require('node-cron');
const isResolvable = require('is-resolvable');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');
const { error } = require('@evershop/evershop/src/lib/log/logger');

module.exports = exports;

function start() {
  // Get the list of jobs from the configuration
  const jobs = getConfig('system.jobs', []);

  const goodJobs = [];
  jobs.forEach((job) => {
    if (!isResolvable(job.resolve)) {
      error(
        `Job ${job.name} is not resolvable. Please check again the 'resolve' property.`
      );
    } else if (!cron.validate(job.schedule)) {
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
        const jobFunction = require(job.resolve);
        // Make sure the module is a function or async function
        if (typeof jobFunction !== 'function') {
          throw new Error(
            `Job ${job.name} is not a function. Make sure the module exports a function as default.`
          );
        }
        // Execute the job
        await jobFunction();
      } catch (e) {
        error(e);
      }
    });
  });
}

start();

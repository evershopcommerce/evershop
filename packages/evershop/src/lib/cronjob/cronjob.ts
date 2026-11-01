import cron from 'node-cron';
import { getEnabledExtensions } from '../../bin/extension/index.js';
import { loadBootstrapScript } from '../../bin/lib/bootstrap/bootstrap.js';
import { getCoreModules } from '../../bin/lib/loadModules.js';
import { lockAddressRegistry } from '../address/formats.js';
import { debug, error } from '../log/logger.js';
import { lockHooks } from '../util/hookable.js';
import { lockRegistry } from '../util/registry.js';
import { getEnabledJobs } from './jobManager.js';
import { runJob } from './runJob.js';

async function start() {
  const modules = [...getCoreModules(), ...getEnabledExtensions()];
  /** Loading bootstrap script from modules */
  try {
    for (const module of modules) {
      await loadBootstrapScript(module, {
        ...JSON.parse(process.env.bootstrapContext || '{}'),
        process: 'cronjob'
      });
    }
    lockHooks();
    lockRegistry();
    lockAddressRegistry();
  } catch (e) {
    error(e);
    process.exit(0);
  }
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

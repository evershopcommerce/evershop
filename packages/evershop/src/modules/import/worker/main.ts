import { hostname } from 'os';
import { headlessBoot } from '../../../bin/lib/bootstrap/headlessBoot.js';
import { error as logError } from '../../../lib/log/logger.js';
import { composeWorker } from './compose.js';
import { createCorePorts } from './corePorts.js';
import { runWorker } from './runWorker.js';

/**
 * The worker process (§ 8.4, Who runs it, and the spawn contract): started with
 * the uuid of one job, with no IPC channel, detached from the process that
 * started it. It boots every module as the event process does (so the
 * processors that core and extensions register are there), runs the step that
 * belongs to the job's status, and ends with an explicit `process.exit`: 0 for
 * every end of a run, 1 when the job could not run. SIGTERM is a request to
 * stop: the run finishes its row, ends the job `interrupted` and exits.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function main(): Promise<number> {
  const jobUuid = process.argv[2];
  if (!jobUuid || !UUID.test(jobUuid)) {
    logError(new Error('The import worker needs the uuid of a job.'));
    return 1;
  }
  await headlessBoot({
    context: {
      process: 'import',
      command: 'import-worker',
      env: process.env.NODE_ENV === 'production' ? 'production' : 'development'
    },
    refreshSettings: true,
    loadRoutes: true
  });
  const { deps, admin, close } = composeWorker(createCorePorts());
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  try {
    const result = await runWorker(jobUuid, {
      deps,
      admin,
      workerId: `${hostname()}:${process.pid}`,
      signal: controller.signal
    });
    return result.exitCode;
  } finally {
    await close();
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    logError(e);
    process.exit(1);
  }
);

import { hostname, setPriority } from 'os';
import { headlessBoot } from '../../../bin/lib/bootstrap/headlessBoot.js';
import { error as logError } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { retentionMs } from '../adapters/importConfig.js';
import { PgJobAdmin } from '../adapters/PgJobAdmin.js';
import { PgJobRepository } from '../adapters/PgJobRepository.js';
import { composeWorker } from './compose.js';
import { createCorePorts } from './corePorts.js';
import { failUnstarted } from './failUnstarted.js';
import { runWorkerProcess } from './runProcess.js';

/**
 * The worker process (§ 8.4, Who runs it, and the spawn contract): started with
 * the uuid of one job, with no IPC channel, detached from the process that
 * started it. It boots every module as the event process does (so the
 * processors that core and extensions register are there), runs the step that
 * belongs to the job's status, and ends with an explicit `process.exit`: 0 for
 * every end of a run, 1 when the job could not run. SIGTERM is a request to
 * stop: the run finishes its row, ends the job `interrupted` and exits.
 * `runProcess.ts` has the logic; this file is the process around it.
 */

// The process may outlive the terminal or the pipe it writes to; a failed
// write to a log is not a reason to stop an import.
for (const stream of [process.stdout, process.stderr]) {
  stream.on('error', () => undefined);
}

// Best effort: the import should not take the CPU of the store from its shoppers.
try {
  setPriority(10);
} catch {
  // Not allowed here; the worker runs at the priority it was started with.
}

const workerId = `${hostname()}:${process.pid}`;
const controller = new AbortController();

runWorkerProcess(process.argv[2], {
  async boot() {
    await headlessBoot({
      context: {
        command: 'import-worker',
        env:
          process.env.NODE_ENV === 'production' ? 'production' : 'development',
        // What the event process was started with, when it started this worker.
        ...JSON.parse(process.env.bootstrapContext || '{}'),
        process: 'import'
      },
      refreshSettings: true,
      loadRoutes: true
    });
    // As the event process does after its own boot.
    process.env.ALLOW_CONFIG_MUTATIONS = 'false';
    process.on('SIGTERM', () => controller.abort());
    process.on('SIGINT', () => controller.abort());
  },
  compose: () => composeWorker(createCorePorts()),
  failUnstarted: (jobUuid, reason) =>
    failUnstarted(jobUuid, reason, {
      admin: new PgJobAdmin(pool, { retentionMs: retentionMs() }),
      jobs: new PgJobRepository(pool, { retentionMs: retentionMs() }),
      workerId
    }),
  workerId,
  signal: controller.signal,
  logError: (e) => logError(e as Error)
}).then(
  (code) => process.exit(code),
  (e) => {
    logError(e);
    process.exit(1);
  }
);

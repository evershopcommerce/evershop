import { fileURLToPath } from 'url';
import { pool } from '../../../lib/postgres/connection.js';
import { CoreJobRequests } from '../adapters/CoreJobRequests.js';
import { coreLogger } from '../adapters/coreLogger.js';
import {
  maxWorkersPerInstance,
  retentionMs,
  workerMemoryMb
} from '../adapters/importConfig.js';
import { NodeWorkerPool } from '../adapters/NodeWorkerPool.js';
import type { SpawnFn } from '../adapters/NodeWorkerPool.js';
import { PgJobAdmin } from '../adapters/PgJobAdmin.js';
import { PgJobMaintenance } from '../adapters/PgJobMaintenance.js';
import type { DispatchDeps } from '../services/dispatch/dispatchRequest.js';
import type { JobMaintenance } from '../services/ports/jobMaintenance.js';
import type { JobRequests } from '../services/ports/jobRequests.js';
import type { Logger } from '../services/ports/logger.js';

/** The compiled worker, next to this folder. */
export const WORKER_SCRIPT = fileURLToPath(
  new URL('../worker/main.js', import.meta.url)
);

/**
 * Builds the wiring from core's pool and configuration. `spawn` is for a test
 * that wants to see how the worker would be started.
 */
export function createDispatchDeps(spawn?: SpawnFn): DispatchDeps {
  return {
    jobs: new PgJobAdmin(pool),
    workers: new NodeWorkerPool({
      script: WORKER_SCRIPT,
      memoryMb: workerMemoryMb(),
      logger: coreLogger,
      spawn
    }),
    maxWorkers: maxWorkersPerInstance(),
    logger: coreLogger
  };
}

let cached: DispatchDeps | null = null;

/**
 * What the subscriber of `import_job_requested` needs, built once in the event
 * process. It is one object for the life of the process, because the pool of
 * workers counts the workers it has started.
 *
 * This file is not in `subscribers/`: core loads every file under
 * `subscribers/<event>/` as a handler.
 */
export function dispatchDeps(): DispatchDeps {
  cached ??= createDispatchDeps();
  return cached;
}

export interface MaintenanceDeps {
  maintenance: JobMaintenance;
  requests: JobRequests;
  logger: Logger;
}

/**
 * What the cron jobs need (§ 8.4), built from core's pool and configuration:
 * the maintenance of the jobs, and the requests for a worker (the dispatch cron
 * asks again through the same port the API uses).
 */
export function createMaintenanceDeps(): MaintenanceDeps {
  return {
    maintenance: new PgJobMaintenance(pool, { retentionMs: retentionMs() }),
    requests: new CoreJobRequests(pool, coreLogger),
    logger: coreLogger
  };
}

let cachedMaintenance: MaintenanceDeps | null = null;

/** The wiring of the cron jobs, built once in the cron process. */
export function maintenanceDeps(): MaintenanceDeps {
  cachedMaintenance ??= createMaintenanceDeps();
  return cachedMaintenance;
}

import { fileURLToPath } from 'url';
import { pool } from '../../../lib/postgres/connection.js';
import { coreLogger } from '../adapters/coreLogger.js';
import {
  maxWorkersPerInstance,
  workerMemoryMb
} from '../adapters/importConfig.js';
import { NodeWorkerPool } from '../adapters/NodeWorkerPool.js';
import type { SpawnFn } from '../adapters/NodeWorkerPool.js';
import { PgJobAdmin } from '../adapters/PgJobAdmin.js';
import type { DispatchDeps } from '../services/dispatch/dispatchRequest.js';

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

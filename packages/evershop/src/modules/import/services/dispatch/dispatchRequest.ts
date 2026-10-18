import { isJobUuid } from '../job/uuid.js';
import type { JobAdmin } from '../ports/jobAdmin.js';
import type { Logger } from '../ports/logger.js';
import type { WorkerPool } from '../ports/workerPool.js';

export interface DispatchDeps {
  jobs: Pick<JobAdmin, 'getByUuid'>;
  workers: WorkerPool;
  /** An instance runs at most this many workers (`maxWorkersPerInstance`, § 8.7). */
  maxWorkers: number;
  logger: Logger;
}

/**
 * - `started`: a worker was started.
 * - `full`: this instance runs its limit of workers; the job stays as it is.
 * - `not_waiting`: the job is not `uploaded` or `queued` (a worker has claimed it,
 *   or it has ended): nothing to do.
 * - `not_found`: the job is gone.
 * - `invalid`: the request has no job uuid.
 */
export type DispatchOutcome =
  | 'started'
  | 'full'
  | 'not_waiting'
  | 'not_found'
  | 'invalid';

/**
 * What this instance does with a request for a worker (§ 8.4, the spawn
 * contract): starts one when the job is waiting for it and the instance has
 * room. The job is not claimed here: the worker claims it, with a
 * compare-and-swap, so a second request for the same job (the dispatch cron
 * asks again after 30 seconds) starts a worker that finds the job claimed and
 * ends quietly. A request that finds the instance full is not queued: the job
 * stays `uploaded` or `queued` and the dispatch cron asks again.
 */
export async function dispatchRequest(
  deps: DispatchDeps,
  jobUuid: unknown
): Promise<DispatchOutcome> {
  const { jobs, workers, maxWorkers, logger } = deps;
  if (!isJobUuid(jobUuid)) {
    logger.warn('An import request has no job uuid', {
      jobUuid: String(jobUuid).slice(0, 100)
    });
    return 'invalid';
  }
  const job = await jobs.getByUuid(jobUuid.toLowerCase());
  if (!job) {
    logger.info('The requested import job is not there', { jobUuid });
    return 'not_found';
  }
  if (job.status !== 'uploaded' && job.status !== 'queued') {
    logger.info('The requested import job is not waiting for a worker', {
      jobUuid,
      status: job.status
    });
    return 'not_waiting';
  }
  // Nothing is awaited between this check and `start`, so requests handled at
  // the same time cannot both take the last place.
  if (workers.running() >= maxWorkers) {
    logger.info('This instance runs its limit of import workers', {
      jobUuid,
      maxWorkers
    });
    return 'full';
  }
  workers.start(job.uuid);
  logger.info('An import worker was started', { jobUuid, status: job.status });
  return 'started';
}

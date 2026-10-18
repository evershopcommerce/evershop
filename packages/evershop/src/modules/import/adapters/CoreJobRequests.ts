import type { Pool } from 'pg';
import { emit } from '../../../lib/event/emitter.js';
import type { JobRequests } from '../services/ports/jobRequests.js';
import type { Logger } from '../services/ports/logger.js';

/** The name of the event that asks for a worker (§ 8.4). */
export const JOB_REQUESTED = 'import_job_requested';

/**
 * Asks for a worker by writing the event `import_job_requested` with the uuid of
 * the job. The event process of one instance claims it (`FOR UPDATE SKIP
 * LOCKED`) and starts the worker there. The event is written on the pool, after
 * the status change has been committed, so a subscriber never sees a job that
 * is not yet in its new status.
 *
 * It never throws: a request that cannot be written is logged, and the dispatch
 * cron asks again for a job that keeps waiting.
 */
export class CoreJobRequests implements JobRequests {
  constructor(private readonly pool: Pool, private readonly logger: Logger) {}

  async request(jobUuid: string): Promise<void> {
    try {
      await emit(JOB_REQUESTED, { jobUuid }, this.pool);
    } catch (e) {
      this.logger.error('A worker could not be requested for an import job', {
        jobUuid,
        reason: (e as Error).message
      });
    }
  }
}

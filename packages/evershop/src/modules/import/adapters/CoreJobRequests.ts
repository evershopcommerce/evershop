import type { Pool } from 'pg';
import { emit } from '../../../lib/event/emitter.js';
import type { JobRequests } from '../services/ports/jobRequests.js';
import type { Logger } from '../services/ports/logger.js';

/** Core marks an event `processing` for longer than this as failed (`EventStorage`). */
const STUCK_MINUTES = 5;

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

  async inFlight(jobUuids: readonly string[]): Promise<Set<string>> {
    if (jobUuids.length === 0) return new Set();
    // As the backlog of events is counted (§ 8.5): an event that has been
    // `processing` for more than the time core allows belongs to an event
    // process that died, and nobody will answer it.
    const result = await this.pool.query(
      `SELECT DISTINCT data->>'jobUuid' AS job_uuid FROM event
        WHERE name = $1
          AND (status = 'pending'
               OR (status = 'processing'
                   AND started_at > now() - interval '${STUCK_MINUTES} minutes'))
          AND data->>'jobUuid' = ANY($2::text[])`,
      [JOB_REQUESTED, jobUuids.map((uuid) => uuid.toLowerCase())]
    );
    return new Set(
      result.rows.map((row) => String(row.job_uuid).toLowerCase())
    );
  }
}

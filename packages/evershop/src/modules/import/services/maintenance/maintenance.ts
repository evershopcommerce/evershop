import {
  DEAD_AFTER_MS,
  DISPATCH_AFTER_MS,
  UPLOAD_IDLE_MS
} from '../job/transitions.js';
import type {
  CleanupResult,
  JobMaintenance,
  RecoveredJob
} from '../ports/jobMaintenance.js';
import type { JobRequests } from '../ports/jobRequests.js';
import type { Logger } from '../ports/logger.js';

/** The sentence the admin reads on a job the recovery has interrupted. */
export function recoveredMessage(deadAfterMs: number): string {
  return `The import stopped: its worker did not report for ${Math.round(
    deadAfterMs / 1000
  )} seconds (the server may have been restarted). Resume it to continue.`;
}

/**
 * The recovery cron (`importRecover`, § 8.4): a worker that has not written its
 * heartbeat for 2 minutes is dead, and its job is `interrupted`, which frees the
 * place of the one import at a time. Safe to run on every instance at once.
 */
export async function recoverDeadJobs(deps: {
  maintenance: Pick<JobMaintenance, 'recoverDead'>;
  logger: Logger;
}): Promise<RecoveredJob[]> {
  const recovered = await deps.maintenance.recoverDead(
    DEAD_AFTER_MS,
    recoveredMessage(DEAD_AFTER_MS)
  );
  for (const job of recovered) {
    deps.logger.warn(
      'An import worker stopped reporting; the job is interrupted',
      {
        jobUuid: job.uuid,
        entity: job.entity,
        was: job.was
      }
    );
  }
  return recovered;
}

export interface DispatchReport {
  /** Requests written. */
  asked: number;
  /** Waiting jobs that already had a request on its way. */
  inFlight: number;
  /** Requests that could not be written. */
  failed: number;
}

/**
 * The dispatch cron (`importDispatch`, § 8.4): asks again for a worker for each
 * job that has waited more than 30 seconds in `uploaded` or `queued`, because
 * an event can be lost, delayed behind a long queue, or dropped by an instance
 * that was full. A job that already has a request on its way is left alone, or
 * a queue of events that is slow to drain would fill up with copies of it. A
 * second request that does get through starts a worker that finds the job
 * claimed and ends quietly, so being too eager is harmless.
 */
export async function dispatchWaitingJobs(deps: {
  maintenance: Pick<JobMaintenance, 'waitingForWorker'>;
  requests: JobRequests;
  logger: Logger;
}): Promise<DispatchReport> {
  const waiting = await deps.maintenance.waitingForWorker(DISPATCH_AFTER_MS);
  const report: DispatchReport = { asked: 0, inFlight: 0, failed: 0 };
  if (waiting.length === 0) return report;
  const busy = await deps.requests.inFlight(waiting);
  for (const jobUuid of waiting) {
    if (busy.has(jobUuid)) {
      report.inFlight += 1;
    } else {
      try {
        // One after the other: the order is the order of waiting.
        await deps.requests.request(jobUuid);
        report.asked += 1;
      } catch (e) {
        report.failed += 1;
        deps.logger.error(
          'A worker could not be requested again for an import job',
          {
            jobUuid,
            reason: (e as Error).message
          }
        );
      }
    }
  }
  if (report.asked > 0) {
    deps.logger.info(
      'Import jobs that waited too long were offered to a worker again',
      {
        ...report
      }
    );
  }
  return report;
}

/**
 * The cleanup cron (`importCleanup`, § 8.4): removes what nobody will use again
 * (an upload that stopped, a job past its retention, the file of a job that
 * ended clean).
 */
export async function cleanUpJobs(deps: {
  maintenance: Pick<JobMaintenance, 'cleanUp'>;
  logger: Logger;
}): Promise<CleanupResult> {
  const result = await deps.maintenance.cleanUp(UPLOAD_IDLE_MS);
  if (result.abandonedUploads + result.expiredJobs + result.filesDropped > 0) {
    deps.logger.info('Import jobs were cleaned up', { ...result });
  }
  return result;
}

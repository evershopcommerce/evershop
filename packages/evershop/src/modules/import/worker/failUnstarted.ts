import { jobMessages } from '../services/job/messages.js';
import type { JobAdmin } from '../services/ports/jobAdmin.js';
import type { JobRepository } from '../services/ports/jobRepository.js';

export interface FailUnstartedDeps {
  admin: Pick<JobAdmin, 'getByUuid'>;
  jobs: Pick<JobRepository, 'claim' | 'finish'>;
  workerId: string;
}

const MAX_MESSAGE = 500;

/**
 * J2 (§ 8.6): the worker could not start (a module's bootstrap threw, the
 * database could not be reached). Nothing was processed, and a job left as it
 * is would be offered to a new worker every minute by the dispatch cron, which
 * would fail the same way. So the job is claimed, as any worker does, and ended
 * `failed` with the reason: the admin fixes the cause and uploads the file again.
 *
 * It does nothing to a job that is not waiting for a worker or that another
 * worker has claimed first. Returns whether the job was ended.
 */
export async function failUnstarted(
  jobUuid: string,
  reason: unknown,
  deps: FailUnstartedDeps
): Promise<boolean> {
  const job = await deps.admin.getByUuid(jobUuid.toLowerCase());
  if (!job) return false;
  const to =
    job.status === 'uploaded'
      ? 'validating'
      : job.status === 'queued'
      ? 'running'
      : null;
  if (to === null) return false;
  const attempt = await deps.jobs.claim(job.id, job.status, to, deps.workerId);
  if (attempt === null) return false;
  const text = reason instanceof Error ? reason.message : String(reason);
  const firstLine = text.split(/\r?\n/)[0].trim();
  return deps.jobs.finish(job.id, attempt, 'failed', {
    errorMessage: String(jobMessages.workerCouldNotStart(firstLine)).slice(
      0,
      MAX_MESSAGE
    )
  });
}

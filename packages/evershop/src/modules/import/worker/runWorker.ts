import type { ImportDeps } from '../services/deps.js';
import type { JobAdmin } from '../services/ports/jobAdmin.js';
import { runImport, runValidation } from '../services/runner/index.js';
import type { RunOutcome } from '../services/runner/index.js';

export interface WorkerRun {
  deps: ImportDeps;
  admin: Pick<JobAdmin, 'getByUuid'>;
  /** `host:pid`, written on the job for diagnosis. */
  workerId: string;
  /** Aborted by SIGTERM: the run finishes its row and ends `interrupted`. */
  signal?: AbortSignal;
}

export type WorkerOutcome = RunOutcome | 'not_found' | 'not_runnable';

export interface WorkerResult {
  outcome: WorkerOutcome;
  /** What the process exits with: 1 only when the job could not run. */
  exitCode: 0 | 1;
}

/**
 * What one worker process does (§ 8.4, Who runs it): finds its job by the uuid it
 * was started with, and runs the step that belongs to the job's status: an
 * `uploaded` job is checked, a `queued` job is imported. Any other status means
 * there is nothing for it to do (an event and the dispatch cron's second event
 * for the same job are harmless, so a worker that arrives second finds the job
 * claimed or finished and ends quietly). The exit code is 0 for every end of a
 * run (checked, completed, stopped, canceled, interrupted, or quietly
 * gone) and 1 when the job could not run (`failed`: a damaged file or a bug).
 */
export async function runWorker(
  jobUuid: string,
  run: WorkerRun
): Promise<WorkerResult> {
  const { deps, admin, workerId, signal } = run;
  const job = await admin.getByUuid(jobUuid);
  if (!job) {
    deps.logger.info('The import job is not there', { jobUuid });
    return { outcome: 'not_found', exitCode: 0 };
  }
  const options = { worker: workerId, signal };
  let outcome: RunOutcome;
  if (job.status === 'uploaded') {
    outcome = (await runValidation(job.id, deps, options)).outcome;
  } else if (job.status === 'queued') {
    outcome = (await runImport(job.id, deps, options)).outcome;
  } else {
    deps.logger.info('The import job has nothing to run', {
      jobUuid,
      status: job.status
    });
    return { outcome: 'not_runnable', exitCode: 0 };
  }
  deps.logger.info('The import run ended', { jobUuid, outcome });
  return { outcome, exitCode: outcome === 'failed' ? 1 : 0 };
}

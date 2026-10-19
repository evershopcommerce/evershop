import type { ImportDeps } from '../deps.js';
import type { ImportEntity } from '../types.js';
import { checkFile } from './checkFile.js';
import { pipelineFor } from './pipeline.js';
import { failureMessage, Session } from './session.js';
import type { RunOptions, RunResult } from './session.js';

/**
 * Checks the file of an `uploaded` job and leaves it `validated`, with the
 * problems (§ 4.5, point 4). It writes nothing but the job: the dry run.
 *
 * A problem with the file is not a failure of the job: the job is `validated`
 * and has errors, and Start is refused until the file is fixed. The job fails
 * only when the file is damaged or the engine breaks.
 */
export async function runValidation(
  jobId: number,
  deps: ImportDeps,
  options: RunOptions = {}
): Promise<RunResult> {
  const attempt = await deps.jobs.claim(
    jobId,
    'uploaded',
    'validating',
    options.worker ?? 'worker'
  );
  if (attempt === null) {
    return { outcome: 'not_claimed' };
  }
  const job = await deps.jobs.get(jobId);
  if (!job) {
    return { outcome: 'lost' };
  }
  const session = new Session(deps, job, attempt, job.counts, options.signal);
  session.start();
  try {
    if (!(await deps.jobs.clearIssues(jobId, attempt, 'validate'))) {
      return await session.abandon();
    }
    // An import that is queued or running while the file is checked can make the
    // check wrong (a products file checked before its categories exist): the
    // job says which, when one was there at the start or at the end.
    const importAtStart = await busyImport(deps, jobId);
    session.stage = 'reading';
    const pipeline = pipelineFor(job.entity);
    if (!pipeline) {
      return await session.finish(
        'failed',
        `A ${job.entity} file cannot be checked yet.`
      );
    }
    await checkFile(session, job, pipeline);
    session.counts.overlappedImport =
      importAtStart ?? (await busyImport(deps, jobId));
    return await session.finish('validated');
  } catch (error) {
    deps.logger.error('The check failed', {
      job: jobId,
      error: String((error as Error)?.message ?? error)
    });
    return session.finish('failed', failureMessage(error));
  }
}

// The question is a hint for the page: when the store cannot answer it, the
// check goes on without the hint.
async function busyImport(
  deps: ImportDeps,
  jobId: number
): Promise<ImportEntity | null> {
  try {
    return await deps.jobs.busyImport();
  } catch (error) {
    deps.logger.warn('The running imports could not be looked up', {
      job: jobId,
      error: String((error as Error)?.message ?? error)
    });
    return null;
  }
}

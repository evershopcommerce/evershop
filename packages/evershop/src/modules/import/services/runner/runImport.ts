import { MAX_FAILED_ROWS } from '../deps.js';
import type { ImportDeps } from '../deps.js';
import { indexFile } from '../validate/validateFile.js';
import type { WriteOutcome } from '../write/categoryWriter.js';
import { checkFile } from './checkFile.js';
import { pipelineFor } from './pipeline.js';
import {
  failureMessage,
  Session,
  validationContext,
  validationLimits
} from './session.js';
import type { RunOptions, RunResult } from './session.js';

const RECHECK_MESSAGE =
  'The file has problems that were not there when it was checked, so nothing was written. See the problems, then check again.';

/**
 * Imports the file of a `queued` job (§ 4.5, point 4; § 8.4).
 *
 * A job that has not written anything (`started_at` is empty) is checked again
 * first, from row 1 and without fetching images (D-33): what changed in the store
 * since the check shows up now and not as failed rows. With errors the job goes
 * back to `validated`, nothing is written, and the slot for "one import at a
 * time" is free again.
 *
 * Then the units are written in plan order. A failed row does not stop the run;
 * the tenth does (D-14, `stopped`). A job that has written something is a resumed
 * one: it does not check again, it writes again the rows that failed or were
 * skipped, and then the units after the last one it saved.
 */
export async function runImport(
  jobId: number,
  deps: ImportDeps,
  options: RunOptions = {}
): Promise<RunResult> {
  const attempt = await deps.jobs.claim(
    jobId,
    'queued',
    'running',
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
  const { counts, control } = session;
  session.start();
  try {
    const pipeline = pipelineFor(job.entity);
    if (!pipeline) {
      return await session.finish(
        'failed',
        `A ${job.entity} file cannot be imported yet.`
      );
    }
    const resumed = job.startedAt !== null;

    if (!resumed) {
      session.stage = 'rechecking';
      if (!(await deps.jobs.clearIssues(jobId, attempt, 'validate'))) {
        return await session.abandon();
      }
      const summary = await checkFile(session, job, pipeline);
      if (control.reason) {
        return await session.finish('validated');
      }
      if (summary.errors > 0) {
        return await session.finish('validated', RECHECK_MESSAGE);
      }
      if (!(await deps.jobs.markStarted(jobId, attempt))) {
        return await session.abandon();
      }
    }

    session.stage = 'writing';
    const context = validationContext(deps, job);
    const open = () => deps.files.open(job.id);
    const limits = validationLimits(deps);
    const indexed = await indexFile({
      validator: pipeline.validator,
      context,
      open,
      limits,
      signal: control.signal
    });
    if (control.reason) {
      return await session.finish('completed');
    }
    if (indexed.header === null || indexed.stopped) {
      throw new Error('The file could not be read to plan the import');
    }
    const plan = pipeline.plan(indexed.state);

    // A resumed run writes again the rows that failed or were skipped, and
    // then the units after the last one that was saved. The old problems of
    // the import go; the ones of this run replace them.
    const lastUnitBefore = counts.lastUnit;
    let retryRows = new Set<number>();
    if (resumed) {
      retryRows = await deps.jobs.errorRows(jobId, 'import');
      if (!(await deps.jobs.clearIssues(jobId, attempt, 'import'))) {
        return await session.abandon();
      }
    }
    session.beginPhase('import');

    let failedThisRun = 0;
    let tooManyFailures = false;
    const writing = pipeline.write({
      open,
      limits,
      header: indexed.header,
      state: indexed.state,
      plan,
      context,
      services: deps.services,
      images: deps.images,
      clock: deps.clock,
      resumed,
      include: resumed
        ? ({ unit, rowNumber }) =>
            unit > lastUnitBefore || retryRows.has(rowNumber)
        : undefined,
      signal: control.signal
    });
    for await (const outcome of writing) {
      record(session, outcome);
      if (outcome.result === 'failed') {
        failedThisRun += 1;
        if (failedThisRun >= MAX_FAILED_ROWS) {
          tooManyFailures = true;
          break;
        }
      }
    }

    if (tooManyFailures && !control.reason) {
      return await session.finish(
        'stopped',
        `Stopped after ${MAX_FAILED_ROWS} failed rows.`
      );
    }
    return await session.finish('completed');
  } catch (error) {
    deps.logger.error('The import failed', {
      job: jobId,
      error: String((error as Error)?.message ?? error)
    });
    return session.finish('failed', failureMessage(error));
  }
}

// What one row did to the counts and the problems.
function record(session: Session, outcome: WriteOutcome): void {
  const { counts } = session;
  if (outcome.result === 'created') counts.created += 1;
  else if (outcome.result === 'updated') counts.updated += 1;
  else if (outcome.result === 'failed') counts.failed += 1;
  else counts.skipped += 1;
  for (const issue of outcome.issues) {
    session.sinks.import.add(issue, outcome.key);
    counts.byCode.import[issue.code] =
      (counts.byCode.import[issue.code] ?? 0) + 1;
  }
  if (outcome.unit > counts.lastUnit) {
    counts.lastUnit = outcome.unit;
  }
}

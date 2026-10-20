import { MAX_FAILED_ROWS } from '../deps.js';
import type { ImportDeps } from '../deps.js';
import type { PageEntity } from '../ports/pageAddresses.js';
import { isTransientDatabaseError } from '../retry.js';
import type { ImportEntity } from '../types.js';
import { indexFile } from '../validate/validateFile.js';
import type { WriteOutcome } from '../write/categoryWriter.js';
import { BacklogGate } from './backlogGate.js';
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

// The records whose page address a creation event makes (IMP-08).
const PAGE_ENTITY: Partial<Record<ImportEntity, PageEntity>> = {
  category: 'category',
  product: 'product'
};

/** J5: the text of the job when the event queue did not drain in time. */
export function notDrainingMessage(config: ImportDeps['config']): string {
  const minutes = Math.round((config.eventBacklogMaxWaitMs / 60_000) * 10) / 10;
  return `The event process is not draining: more than ${config.eventBacklogHigh} events were waiting for ${minutes} minutes. Find out why events are not processed, then resume the import.`;
}

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
 *
 * Before each row it asks the event queue whether it may go on (§ 8.5): writing
 * a row writes events, and a long queue delays every other event of the store.
 * A queue that does not drain within the time allowed ends the run `interrupted`
 * (J5), and the job can be resumed.
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
      const summary = await checkFile(session, job, pipeline, [
        'rechecking',
        'rechecking'
      ]);
      if (control.reason) {
        return await session.finish('validated');
      }
      if (summary.errors > 0) {
        return await session.finish('validated', RECHECK_MESSAGE);
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

    let failedThisRun = 0;
    let tooManyFailures = false;
    let gaveUp = false;
    const gate = new BacklogGate({
      backlog: deps.backlog,
      clock: deps.clock,
      logger: deps.logger,
      limits: {
        high: deps.config.eventBacklogHigh,
        low: deps.config.eventBacklogLow,
        maxWaitMs: deps.config.eventBacklogMaxWaitMs
      },
      signal: control.signal,
      jobId,
      setWaiting: (waiting) => session.setWaiting(waiting)
    });
    /** True when the next row may be written. */
    const mayWrite = async (): Promise<boolean> => {
      const answer = await gate.pass();
      gaveUp = answer === 'gave_up';
      return answer === 'go';
    };
    /**
     * After the last unit (IMP-08): the events of the import are handled, and the
     * records whose event was lost get it again. A run that has to stop does not
     * wait for it, and a repair that fails does not fail the import.
     */
    const rebuildPageAddresses = async (): Promise<void> => {
      const entity = PAGE_ENTITY[job.entity];
      if (entity === undefined) {
        return;
      }
      try {
        // A run that has to stop is not waited for: `settle` says `stopped`.
        const settled = await gate.settle();
        if (settled === 'stopped') {
          return;
        }
        // The first attempt's start, as the database has it: what a resumed job
        // created earlier counts too, and a first attempt began after the read
        // of `job` above.
        const since = (await deps.jobs.get(jobId))?.startedAt ?? null;
        if (since === null) {
          return;
        }
        const rebuilt = await deps.pages.reemitMissing(entity, since);
        counts.pagesRebuilt += rebuilt;
        if (rebuilt > 0) {
          deps.logger.warn('Page addresses were rebuilt after the import', {
            job: jobId,
            entity,
            rebuilt
          });
        }
      } catch (error) {
        deps.logger.warn('The page addresses could not be checked', {
          job: jobId,
          error: String((error as Error)?.message ?? error)
        });
      }
    };
    /** The end of a run that writes no more, by the reason it stopped. */
    const conclude = async (): Promise<RunResult> => {
      if (gaveUp && !control.reason) {
        return await session.finish(
          'interrupted',
          notDrainingMessage(deps.config)
        );
      }
      if (tooManyFailures && !control.reason) {
        return await session.finish(
          'stopped',
          `Stopped after ${MAX_FAILED_ROWS} failed rows.`
        );
      }
      await rebuildPageAddresses();
      return await session.finish('completed');
    };

    // The first look at the queue is before the run changes anything about the
    // job. A run that waits here and gives up (or is stopped) leaves the job as
    // it was: one that never wrote has no `started_at`, so it is checked again
    // when it is resumed (D-33), and a resumed one keeps its problems, which
    // tell the next run which rows to write again.
    if (!(await mayWrite())) {
      return await conclude();
    }
    if (!resumed && !(await deps.jobs.markStarted(jobId, attempt))) {
      return await session.abandon();
    }

    // A resumed run writes again the rows that failed or were skipped, and
    // then the units after the last one that was saved. The old problems of
    // the import go, except those of the rows still to write again: each of
    // those goes in the checkpoint that records the row's new outcome, so a
    // run that ends before it gets to a row leaves it for the next resume.
    const lastUnitBefore = counts.lastUnit;
    let retryRows = new Set<number>();
    if (resumed) {
      retryRows = await deps.jobs.errorRows(jobId, 'import');
      if (
        !(await deps.jobs.clearIssues(jobId, attempt, 'import', [...retryRows]))
      ) {
        return await session.abandon();
      }
    }
    session.beginPhase('import');

    const writing = pipeline.write({
      open,
      limits,
      header: indexed.header,
      state: indexed.state,
      plan,
      context,
      services: deps.services,
      images: deps.images,
      imageConcurrency: deps.config.imageConcurrency,
      clock: deps.clock,
      pages: deps.pages,
      resumed,
      include: resumed
        ? ({ unit, rowNumber }) =>
            unit > lastUnitBefore || retryRows.has(rowNumber)
        : undefined,
      signal: control.signal
    });
    for await (const outcome of writing) {
      recordOutcome(session, outcome);
      if (retryRows.has(outcome.rowNumber)) {
        session.supersede(outcome.rowNumber);
      }
      if (outcome.result === 'failed') {
        failedThisRun += 1;
        if (failedThisRun >= MAX_FAILED_ROWS) {
          tooManyFailures = true;
          break;
        }
      }
      // Writing a row wrote events: look at the queue before the next one.
      if (!(await mayWrite())) {
        break;
      }
    }
    return await conclude();
  } catch (error) {
    deps.logger.error('The import failed', {
      job: jobId,
      error: String((error as Error)?.message ?? error)
    });
    if (isTransientDatabaseError(error)) {
      // A hiccup of the database outside a row (the reads a batch starts with,
      // the plan): what was written stays and the job can be resumed, as with a
      // row that failed the same way (D-20).
      return session.finish(
        'interrupted',
        `The import was interrupted by an error of the database: ${String(
          (error as Error)?.message ?? error
        )}. Resume it.`.slice(0, 1000)
      );
    }
    return session.finish('failed', failureMessage(error));
  }
}

// What one row did to the counts and the problems.
export function recordOutcome(session: Session, outcome: WriteOutcome): void {
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
  // The place is saved after a unit that is done; one that stopped in the
  // middle is written again from its first row when the job is resumed.
  const reached = outcome.unitDone === false ? outcome.unit - 1 : outcome.unit;
  if (reached > counts.lastUnit) {
    counts.lastUnit = reached;
  }
}

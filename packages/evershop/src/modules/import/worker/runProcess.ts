import type { ImportDeps } from '../services/deps.js';
import { isJobUuid } from '../services/job/uuid.js';
import type { JobAdmin } from '../services/ports/jobAdmin.js';
import { runWorker } from './runWorker.js';

export interface WorkerProcessDeps {
  /** Boots the modules, as the event process does. */
  boot(): Promise<void>;
  /** The real ports, built from what the boot has registered. */
  compose(): {
    deps: ImportDeps;
    admin: Pick<JobAdmin, 'getByUuid'>;
    close(): Promise<void>;
  };
  /** Ends the job `failed` when the worker could not start (J2). */
  failUnstarted(jobUuid: string, reason: unknown): Promise<unknown>;
  /** `host:pid`, written on the job for diagnosis. */
  workerId: string;
  /** Aborted by SIGTERM and SIGINT. */
  signal: AbortSignal;
  logError(e: unknown): void;
}

/**
 * The life of the worker process, without the process: checks its argument,
 * boots, runs the step for the job's status, closes what it opened, and gives
 * the exit code. It exists apart from `main.ts` so that the way it ends can be
 * tested with fakes.
 *
 * - A bad argument: 1, and nothing is booted.
 * - A boot or a composition that fails (J2): the job is ended `failed` with the
 *   reason, so that it is not offered to a new worker again and again, and 1.
 *   If even that fails (the database is down), 1 and the job stays as it was:
 *   the dispatch cron offers it again once the database is back.
 * - Otherwise `runWorker`'s exit code: 1 only when the job could not run.
 */
export async function runWorkerProcess(
  jobUuid: unknown,
  d: WorkerProcessDeps
): Promise<number> {
  if (!isJobUuid(jobUuid)) {
    d.logError(new Error('The import worker needs the uuid of a job.'));
    return 1;
  }
  let composed: ReturnType<WorkerProcessDeps['compose']>;
  try {
    await d.boot();
    composed = d.compose();
  } catch (e) {
    d.logError(e);
    try {
      await d.failUnstarted(jobUuid, e);
    } catch (again) {
      d.logError(again);
    }
    return 1;
  }
  try {
    const result = await runWorker(jobUuid, {
      deps: composed.deps,
      admin: composed.admin,
      workerId: d.workerId,
      signal: d.signal
    });
    return result.exitCode;
  } finally {
    await composed.close();
  }
}

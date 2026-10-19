import { HEARTBEAT_MS } from '../deps.js';
import type { ImportDeps } from '../deps.js';
import type { ValidationContext } from '../entities/definition.js';
import { cloneCounts } from '../job/types.js';
import type {
  IssuePhase,
  JobCounts,
  JobStage,
  JobStatus
} from '../job/types.js';
import type { ImportJob } from '../job/types.js';
import type { CsvLimits } from '../reader/readCsv.js';
import { IssueSink } from './issueSink.js';

/** How a run ended; the caller (the worker's `main`) turns it into an exit code. */
export type RunOutcome =
  | 'validated'
  | 'completed'
  | 'stopped'
  | 'failed'
  | 'canceled'
  | 'interrupted'
  /** Someone else claimed the job first, or it is gone: nothing was done. */
  | 'not_claimed'
  /** The job was deleted, canceled, declared dead or claimed again: the worker stopped, and wrote nothing more. */
  | 'lost';

export interface RunResult {
  outcome: RunOutcome;
  counts?: JobCounts;
  message?: string;
}

export interface RunOptions {
  /** `host:pid`, for diagnosis. */
  worker?: string;
  /** Aborted by SIGTERM: the run finishes its row and ends `interrupted`. */
  signal?: AbortSignal;
}

export type StopReason = 'cancel' | 'lost' | 'interrupted';

/** Why the run has to stop; the first reason stays. */
export class RunControl {
  readonly controller = new AbortController();

  reason: StopReason | null = null;

  stop(reason: StopReason): void {
    if (this.reason === null) {
      this.reason = reason;
      this.controller.abort();
    }
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }
}

export function validationLimits(deps: ImportDeps): Partial<CsvLimits> {
  return {
    maxRows: deps.config.maxRows,
    maxCellLength: deps.config.maxCellLength
  };
}

export function validationContext(
  deps: ImportDeps,
  job: ImportJob
): ValidationContext {
  return {
    lookup: deps.lookup,
    mode: job.mode,
    now: () => deps.clock.now(),
    sha256Hex: deps.sha256Hex
  };
}

const OUTCOME_OF: Partial<Record<JobStatus, RunOutcome>> = {
  validated: 'validated',
  completed: 'completed',
  stopped: 'stopped',
  failed: 'failed',
  canceled: 'canceled',
  interrupted: 'interrupted'
};

/**
 * One run of one job by one worker: the claim it was given, the counts and the
 * problems it has collected, and the heartbeat that writes them (§ 8.4). The
 * heartbeat is on a timer, every 2 seconds, and not in the row loop, so that a
 * long row (a slow image) does not look like a dead worker.
 */
export class Session {
  readonly control = new RunControl();

  readonly sinks: { validate: IssueSink; import: IssueSink };

  counts: JobCounts;

  stage: JobStage | null = null;

  private stopTimer: (() => void) | null = null;

  private ticking = false;

  private readonly owned = { validate: false, import: false };

  private chain: Promise<unknown> = Promise.resolve();

  private readonly onAbort = () => this.control.stop('interrupted');

  constructor(
    readonly deps: ImportDeps,
    readonly job: ImportJob,
    readonly attempt: number,
    counts: JobCounts,
    private readonly outer?: AbortSignal
  ) {
    // The run changes its own copy; only a checkpoint changes the job.
    this.counts = cloneCounts(counts);
    this.sinks = {
      validate: new IssueSink('validate', deps.config.maxIssues),
      import: new IssueSink('import', deps.config.maxIssues)
    };
    if (outer?.aborted) {
      this.control.stop('interrupted');
    } else {
      outer?.addEventListener('abort', this.onAbort);
    }
  }

  start(): void {
    this.stopTimer = this.deps.clock.interval(HEARTBEAT_MS, async () => {
      // A tick that finds the last one still running does nothing.
      if (this.ticking) {
        return;
      }
      this.ticking = true;
      try {
        await this.flush();
      } finally {
        this.ticking = false;
      }
    });
  }

  /**
   * Writes the counts, the stage and the new problems in one step. False when
   * the job is no longer ours (the run is then told to stop) or when the write
   * failed (the problems are kept for the next try).
   */
  flush(): Promise<boolean> {
    const next = this.chain.then(() => this.write());
    this.chain = next.catch(() => undefined);
    return next;
  }

  private async write(): Promise<boolean> {
    if (this.control.reason === 'lost') {
      return false;
    }
    const validate = this.sinks.validate.take();
    const imported = this.sinks.import.take();
    const counts = this.currentCounts();
    try {
      const result = await this.deps.jobs.checkpoint(
        this.job.id,
        this.attempt,
        { counts, stage: this.stage, issues: [...validate, ...imported] }
      );
      if (!result.ok) {
        this.control.stop('lost');
        return false;
      }
      if (result.control === 'cancel') {
        this.control.stop('cancel');
      }
      return true;
    } catch (error) {
      this.sinks.validate.restore(validate);
      this.sinks.import.restore(imported);
      this.deps.logger.warn('The heartbeat could not be written', {
        job: this.job.id,
        error: String((error as Error)?.message ?? error)
      });
      return false;
    }
  }

  /**
   * Tells the job that the run waits for the event queue, or that it does not
   * any more (`waiting_since`, § 8.5). False when the job is no longer ours (the
   * run is then told to stop). A write that fails is logged and does not stop
   * the run: the wait itself does not depend on it, only the hint on the page.
   */
  async setWaiting(waiting: boolean): Promise<boolean> {
    try {
      if (await this.deps.jobs.setWaiting(this.job.id, this.attempt, waiting)) {
        return true;
      }
      this.control.stop('lost');
      return false;
    } catch (error) {
      this.deps.logger.warn('The waiting state could not be written', {
        job: this.job.id,
        error: String((error as Error)?.message ?? error)
      });
      return true;
    }
  }

  /**
   * Starts a phase from the beginning: the totals of an earlier run of it are
   * gone, and this run's problems and cap flag are the ones that count. A phase
   * the run does not begin is left as it was (a check must not clear the flag of
   * an import that was cut at the cap): `currentCounts` takes the flag of the
   * phases the run owns, and only those, from the sinks.
   */
  beginPhase(phase: IssuePhase): void {
    this.owned[phase] = true;
    const { counts } = this;
    counts.byCode[phase] = {};
    if (phase === 'validate') {
      counts.total = 0;
      counts.errors = 0;
      counts.warnings = 0;
      counts.createRows = 0;
      counts.updateRows = 0;
    } else {
      counts.failed = 0;
      counts.skipped = 0;
    }
  }

  /** The counts as they are now, with whether (and from where) the problems were cut at the cap. */
  private currentCounts(): JobCounts {
    const counts = cloneCounts(this.counts);
    for (const phase of ['validate', 'import'] as const) {
      if (this.owned[phase]) {
        counts.issuesTruncated[phase] = this.sinks[phase].truncated;
        counts.firstUnlistedRow[phase] = this.sinks[phase].firstUnlistedRow;
      }
    }
    return counts;
  }

  /**
   * Stops the timer. A write that is under way goes on, and the next one waits
   * for it (`flush` chains them), so the order of the writes is kept.
   */
  stopHeartbeat(): void {
    this.stopTimer?.();
    this.stopTimer = null;
  }

  /** The job is no longer ours: stops without a write. */
  async abandon(): Promise<RunResult> {
    this.control.stop('lost');
    this.stopHeartbeat();
    this.outer?.removeEventListener('abort', this.onAbort);
    return { outcome: 'lost' };
  }

  /**
   * Ends the run. A reason to stop that came in the meantime (a cancel, a
   * SIGTERM) wins over `to` unless the run failed. A job that is no longer ours
   * gets no write at all.
   */
  async finish(
    to: JobStatus,
    message: string | null = null
  ): Promise<RunResult> {
    this.stopHeartbeat();
    this.outer?.removeEventListener('abort', this.onAbort);
    const { reason } = this.control;
    let status = to;
    let text = message;
    if (to !== 'failed') {
      if (reason === 'cancel') {
        status = 'canceled';
        text = null;
      } else if (reason === 'interrupted') {
        status = 'interrupted';
        text = 'The worker was stopped before it finished.';
      }
    }
    if (!(await this.flush()) && this.control.reason === 'lost') {
      return { outcome: 'lost' };
    }
    const done = await this.deps.jobs.finish(
      this.job.id,
      this.attempt,
      status,
      { errorMessage: text, counts: this.currentCounts() }
    );
    if (!done) {
      return { outcome: 'lost' };
    }
    return {
      outcome: OUTCOME_OF[status] ?? 'failed',
      counts: this.currentCounts(),
      message: text ?? undefined
    };
  }
}

/** The text of a failure for the admin (J1, J2, J3). */
export function failureMessage(error: unknown): string {
  const e = error as { name?: string; message?: string };
  if (e?.name === 'FileDamagedError') {
    return 'The uploaded file is damaged. Upload it again.';
  }
  return `The import stopped because of an error: ${String(
    e?.message ?? error
  )}`.slice(0, 1000);
}

import type { Clock } from '../ports/clock.js';
import type { EventBacklog } from '../ports/eventBacklog.js';
import type { Logger } from '../ports/logger.js';

/** The queue is looked at this often at most, not before every row (§ 8.5). */
export const BACKLOG_SAMPLE_MS = 1000;

export interface BacklogLimits {
  /** The worker pauses when more events than this are waiting. */
  high: number;
  /** It goes on when fewer than this are. Below `high`, so that it does not flap. */
  low: number;
  /** It gives up when a pause has lasted this long. */
  maxWaitMs: number;
}

/**
 * What the gate says about the next row: write it (`go`), the run has to stop
 * (`stopped`: a cancel, a SIGTERM, or a job that is no longer ours; the reason is
 * on the run), or the queue did not drain in time (`gave_up`, J5).
 */
export type GateResult = 'go' | 'stopped' | 'gave_up';

export interface BacklogGateDeps {
  backlog: EventBacklog;
  clock: Pick<Clock, 'now' | 'sleep'>;
  logger: Logger;
  limits: BacklogLimits;
  /** Aborted when the run has to stop; a pause ends at its next look. */
  signal: AbortSignal;
  /** For the log lines. */
  jobId: number;
  /** Tells the job that the worker waits or not; false when the job is no longer ours. */
  setWaiting(waiting: boolean): Promise<boolean>;
}

/**
 * Backpressure on the event queue (§ 8.5). The runner asks `pass()` before it
 * writes a row. Most of the time the answer is `go` at once and without a query:
 * the queue is looked at at most once a second. When more than `high` events are
 * waiting the gate marks the job as waiting and holds the run, looking every
 * second, until fewer than `low` are (a gap between the two, so that the run
 * does not stop and start on every other row). A pause that lasts `maxWaitMs`
 * ends the wait with `gave_up`.
 *
 * A look that fails is not a reason to stop an import: if the run is going, it
 * goes on; if it is waiting, it goes on waiting (and the time counts).
 */
export class BacklogGate {
  private sampledAt: number | null = null;

  constructor(private readonly deps: BacklogGateDeps) {}

  async pass(): Promise<GateResult> {
    const { clock, signal, limits, logger, jobId } = this.deps;
    if (signal.aborted) {
      return 'stopped';
    }
    if (
      this.sampledAt !== null &&
      clock.now() - this.sampledAt < BACKLOG_SAMPLE_MS
    ) {
      return 'go';
    }
    let depth = await this.sample();
    if (depth === null || depth <= limits.high) {
      return 'go';
    }

    const since = clock.now();
    logger.info('The import is waiting for the event queue to drain', {
      job: jobId,
      waiting: depth,
      above: limits.high
    });
    if (!(await this.deps.setWaiting(true))) {
      return 'stopped';
    }
    for (;;) {
      await clock.sleep(BACKLOG_SAMPLE_MS);
      if (signal.aborted) {
        return 'stopped';
      }
      depth = await this.sample();
      if (depth !== null && depth < limits.low) {
        break;
      }
      if (clock.now() - since >= limits.maxWaitMs) {
        logger.warn('The event queue did not drain: the import gives up', {
          job: jobId,
          waiting: depth,
          waitedMs: clock.now() - since
        });
        return 'gave_up';
      }
    }
    logger.info('The event queue has drained: the import goes on', {
      job: jobId,
      waiting: depth,
      waitedMs: clock.now() - since
    });
    return (await this.deps.setWaiting(false)) ? 'go' : 'stopped';
  }

  /** The depth of the queue, or null when it could not be read. */
  private async sample(): Promise<number | null> {
    const { backlog, clock, logger, jobId } = this.deps;
    try {
      return await backlog.depth();
    } catch (error) {
      logger.warn('The event queue could not be measured', {
        job: jobId,
        error: String((error as Error)?.message ?? error)
      });
      return null;
    } finally {
      this.sampledAt = clock.now();
    }
  }
}

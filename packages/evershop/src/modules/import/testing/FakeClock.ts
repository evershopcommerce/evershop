import type { Clock } from '../services/ports/clock.js';

interface Interval {
  every: number;
  next: number;
  work: () => void | Promise<void>;
  stopped: boolean;
}

/**
 * TEST-ONLY. A `Clock` that does not wait: `sleep` moves the time forward at once
 * and remembers how long it was asked to wait. The intervals fire as the time
 * passes (during a `sleep` or an `advance`), in the order they are due, and
 * `advance` waits for the work they start, so a test controls the heartbeat.
 */
export class FakeClock implements Clock {
  /** Every wait, in order. */
  readonly sleeps: number[] = [];

  /**
   * When true, the work of an interval is started and not waited for, as a real
   * timer does, so that the code it interrupts goes on while the work is under
   * way. `settle` waits for it.
   */
  detached = false;

  private readonly inFlight: Promise<unknown>[] = [];

  private readonly intervals: Interval[] = [];

  constructor(private time = 1_760_000_000_000) {}

  now(): number {
    return this.time;
  }

  // An arrow function: the stages take `clock.sleep` on its own.
  sleep = async (ms: number): Promise<void> => {
    this.sleeps.push(ms);
    await this.advance(ms);
  };

  interval(ms: number, work: () => void | Promise<void>): () => void {
    const interval: Interval = {
      every: ms,
      next: this.time + ms,
      work,
      stopped: false
    };
    this.intervals.push(interval);
    return () => {
      interval.stopped = true;
    };
  }

  /** Moves the time forward, running every interval that falls due on the way. */
  async advance(ms: number): Promise<void> {
    const target = this.time + ms;
    for (;;) {
      const due = this.intervals
        .filter((interval) => !interval.stopped && interval.next <= target)
        .sort((a, b) => a.next - b.next)[0];
      if (!due) {
        break;
      }
      this.time = Math.max(this.time, due.next);
      due.next += due.every;
      if (this.detached) {
        this.inFlight.push(Promise.resolve(due.work()).catch(() => undefined));
      } else {
        await due.work();
      }
    }
    // A nested `advance` (work that waits on the clock) may have gone further.
    this.time = Math.max(this.time, target);
  }

  /** Waits for the work that a detached interval started. */
  async settle(): Promise<void> {
    await Promise.all(this.inFlight);
  }

  /** The number of intervals that are still running. */
  get running(): number {
    return this.intervals.filter((interval) => !interval.stopped).length;
  }
}

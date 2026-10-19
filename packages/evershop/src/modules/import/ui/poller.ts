import type { ApiFailure, ApiResult } from './importApi.js';

/** How often the page asks while something is going on (§ 8.2). */
export const POLL_INTERVAL_MS = 5000;
/** The longest the page waits between two asks when the server pushes back. */
export const MAX_BACKOFF_MS = 30_000;
/**
 * The longest wait the page accepts from `Retry-After`. Core's limit counts a
 * minute (`base/services/rateLimit.ts`), so a longer wait is a mistake of a proxy.
 */
export const MAX_RETRY_AFTER_MS = 60_000;

/** The browser, as the poller sees it: a timer and the visibility of the tab. */
export interface PollerEnvironment {
  /** The time, in milliseconds since 1970. */
  now(): number;
  setTimer(run: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  isVisible(): boolean;
  /** Calls `listener` when the tab is shown or hidden; returns the way to stop. */
  onVisibilityChange(listener: () => void): () => void;
}

export interface PollerOptions<T> {
  env: PollerEnvironment;
  /** One ask. It never throws: a failure is a result. */
  fetch(): Promise<ApiResult<T>>;
  /** Whether to go on asking after this answer. */
  keepGoing(value: T): boolean;
  /** Every answer that is a success, in order. */
  onValue(value: T): void;
  /** What the page does with an answer that is not one (it keeps its last state). */
  onFailure?(failure: ApiFailure, willRetryInMs: number | null): void;
  intervalMs?: number;
}

/** Statuses after which asking again cannot help: the job is gone or the session ended. */
const STOPS_FOR = new Set([401, 403, 404]);

/**
 * Asks for a value every few seconds while `keepGoing` says so and the tab is
 * visible (§ 8.2). It never has two asks in the air, and it asks again after the
 * last one ended (not on a fixed clock, so a slow server is not piled on). When
 * the server answers 429 or fails, the page keeps its last state and waits:
 * as long as `Retry-After` says, otherwise twice the last wait, up to 30 seconds;
 * the first good answer brings the normal rhythm back.
 */
export class Poller<T> {
  private readonly interval: number;

  private timer: unknown = null;

  private inFlight = false;

  private stopped = true;

  private wait: number;

  private last: T | undefined;

  private unsubscribe: (() => void) | null = null;

  constructor(private readonly options: PollerOptions<T>) {
    this.interval = options.intervalMs ?? POLL_INTERVAL_MS;
    this.wait = this.interval;
  }

  /**
   * Begins, with the value that is already known: nothing is asked while it says
   * the job is over. Without one, the first ask is made at once.
   */
  start(known?: T): void {
    this.stop();
    this.stopped = false;
    this.wait = this.interval;
    this.unsubscribe = this.options.env.onVisibilityChange(() =>
      this.visibilityChanged()
    );
    if (known === undefined) {
      this.ask();
      return;
    }
    this.last = known;
    if (this.options.keepGoing(known)) this.schedule(this.interval);
  }

  /** Asks now, for example after the admin pressed a button. */
  refresh(): void {
    if (this.stopped) return;
    this.cancelTimer();
    this.ask();
  }

  stop(): void {
    this.stopped = true;
    this.cancelTimer();
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      this.options.env.clearTimer(this.timer);
      this.timer = null;
    }
  }

  private schedule(ms: number): void {
    this.cancelTimer();
    // A hidden tab does not ask; it asks at once when it is shown again.
    if (this.stopped || !this.options.env.isVisible()) return;
    this.timer = this.options.env.setTimer(() => {
      this.timer = null;
      this.ask();
    }, ms);
  }

  private visibilityChanged(): void {
    if (this.stopped) return;
    if (!this.options.env.isVisible()) {
      this.cancelTimer();
      return;
    }
    // Shown again: if the last answer says the job goes on, ask now.
    if (
      !this.inFlight &&
      this.timer === null &&
      (this.last === undefined || this.options.keepGoing(this.last))
    ) {
      this.ask();
    }
  }

  private ask(): void {
    if (this.stopped || this.inFlight) return;
    this.inFlight = true;
    this.options.fetch().then(
      (result) => this.answered(result),
      () =>
        // `fetch` is meant not to throw; if it does, treat it as a failed ask.
        this.answered({
          ok: false,
          error: {
            status: 0,
            code: null,
            message: 'The request failed.',
            details: {},
            retryAfterMs: null,
            aborted: false
          }
        })
    );
  }

  private answered(result: ApiResult<T>): void {
    this.inFlight = false;
    if (this.stopped) return;
    if (result.ok) {
      this.wait = this.interval;
      this.last = result.data;
      this.options.onValue(result.data);
      if (!this.stopped && this.options.keepGoing(result.data)) {
        this.schedule(this.interval);
      }
      return;
    }
    const { error } = result;
    if (error.aborted) return;
    if (STOPS_FOR.has(error.status)) {
      this.options.onFailure?.(error, null);
      this.stop();
      return;
    }
    // Retry-After says how long (never less than the normal rhythm, never more
    // than a minute); without it the wait doubles.
    let next: number;
    if (error.retryAfterMs !== null) {
      next = Math.min(
        Math.max(error.retryAfterMs, this.interval),
        MAX_RETRY_AFTER_MS
      );
    } else {
      this.wait = Math.min(this.wait * 2, MAX_BACKOFF_MS);
      next = this.wait;
    }
    this.options.onFailure?.(error, next);
    this.schedule(next);
  }
}

/**
 * Time, as a port (§ 4.5). The stages never read the clock or wait on their own:
 * a test passes a `FakeClock` whose `sleep` returns at once.
 */
export interface Clock {
  /** Milliseconds since the epoch. */
  now(): number;
  sleep(ms: number): Promise<void>;
  /**
   * Calls `work` every `ms` milliseconds until the returned function is called.
   * The heartbeat runs on it (§ 8.4): on a timer, not in the row loop, so that a
   * long row does not look like a dead worker.
   */
  interval(ms: number, work: () => void | Promise<void>): () => void;
}

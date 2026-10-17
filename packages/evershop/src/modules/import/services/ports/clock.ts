/**
 * Time, as a port (§ 4.5). The stages never read the clock or wait on their own:
 * a test passes a `FakeClock` whose `sleep` returns at once.
 */
export interface Clock {
  /** Milliseconds since the epoch. */
  now(): number;
  sleep(ms: number): Promise<void>;
}

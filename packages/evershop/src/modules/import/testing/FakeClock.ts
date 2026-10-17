import type { Clock } from '../services/ports/clock.js';

/**
 * TEST-ONLY. A `Clock` that does not wait: `sleep` moves the time forward at
 * once and remembers how long it was asked to wait.
 */
export class FakeClock implements Clock {
  /** Every wait, in order. */
  readonly sleeps: number[] = [];

  constructor(private time = 1_760_000_000_000) {}

  now(): number {
    return this.time;
  }

  // An arrow function: the stages take `clock.sleep` on its own.
  sleep = async (ms: number): Promise<void> => {
    this.sleeps.push(ms);
    this.time += ms;
  };

  advance(ms: number): void {
    this.time += ms;
  }
}

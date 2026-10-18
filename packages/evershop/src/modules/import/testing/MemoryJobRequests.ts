import type { JobRequests } from '../services/ports/jobRequests.js';

/**
 * TEST-ONLY. A `JobRequests` that keeps the uuids it was asked for, and can be
 * told to fail. A request stays in flight until a test takes it, as the event
 * process takes an event off the queue.
 */
export class MemoryJobRequests implements JobRequests {
  /** Every request made, in order, taken or not. */
  readonly requested: string[] = [];
  private waiting: string[] = [];
  private failures = 0;

  /** The next `times` requests throw. */
  failNext(times = 1): void {
    this.failures = times;
  }

  async request(jobUuid: string): Promise<void> {
    if (this.failures > 0) {
      this.failures -= 1;
      throw new Error('the event could not be written');
    }
    this.requested.push(jobUuid);
    this.waiting.push(jobUuid);
  }

  async inFlight(jobUuids: readonly string[]): Promise<Set<string>> {
    return new Set(jobUuids.filter((uuid) => this.waiting.includes(uuid)));
  }

  /** The event process takes the requests off the queue. */
  take(): string[] {
    const taken = this.waiting;
    this.waiting = [];
    return taken;
  }
}

import type { JobRequests } from '../services/ports/jobRequests.js';

/**
 * TEST-ONLY. A `JobRequests` that keeps the uuids it was asked for, and can be
 * told to fail.
 */
export class MemoryJobRequests implements JobRequests {
  readonly requested: string[] = [];
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
  }
}

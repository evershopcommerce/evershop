import type { WorkerPool } from '../services/ports/workerPool.js';

/**
 * TEST-ONLY. A `WorkerPool` that starts nothing: it keeps the uuids it was
 * asked to start, and a test says when a worker ends.
 */
export class FakeWorkerPool implements WorkerPool {
  readonly started: string[] = [];
  private active = 0;

  running(): number {
    return this.active;
  }

  start(jobUuid: string): void {
    this.started.push(jobUuid);
    this.active += 1;
  }

  /** One worker ends. */
  finishOne(): void {
    this.active = Math.max(0, this.active - 1);
  }
}

/**
 * The workers this instance has started (§ 8.4, the spawn contract). A worker
 * is a process of its own that handles one job and ends.
 */
export interface WorkerPool {
  /** How many workers started here are still running. */
  running(): number;
  /** Starts a worker for the job and returns at once, without waiting for it. */
  start(jobUuid: string): void;
}

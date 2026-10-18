import type { JobStatus } from './types.js';

/**
 * What a worker may do to a job's status (§ 8.4, transitions). One table for the
 * real repository and the test double, so that they cannot disagree.
 */

/** The claims: `from` → `to`, each raising the `attempt`. */
export const CLAIMS: ReadonlyArray<readonly [JobStatus, JobStatus]> = [
  ['uploaded', 'validating'],
  ['queued', 'running']
];

/** What a worker may leave `validating` and `running` for. */
export const FINISH_FROM: Readonly<Record<string, readonly JobStatus[]>> = {
  validating: ['validated', 'failed', 'canceled', 'interrupted'],
  running: [
    'completed',
    'stopped',
    'interrupted',
    'failed',
    'canceled',
    // The check at the start found errors and nothing has been written.
    'validated'
  ]
};

/** The statuses that end a job: it gets a `finished_at`. */
export const FINAL: ReadonlySet<JobStatus> = new Set([
  'completed',
  'failed',
  'canceled'
]);

/** The statuses in which a worker owns the job: only these accept its writes. */
export const WORKER_STATUSES = ['validating', 'running'] as const;

/** The default time a finished job is kept (§ 8.4, Cleanup). */
export const RETENTION_MS = 7 * 86_400_000;

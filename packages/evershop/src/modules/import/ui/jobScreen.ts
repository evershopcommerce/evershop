import { READING_STOPPED_CODES } from '../services/issues.js';
import { OPEN_STATUSES } from '../services/job/types.js';
import type { IssuePhase, JobStatus } from '../services/job/types.js';
import type { ImportEntity } from '../services/types.js';
import type { JobView } from '../web/jobView.js';

/**
 * What the page of one job shows (§ 8.2), decided from the job alone. The page
 * writes the words (`_()`); this module says WHICH screen, WHICH buttons and
 * WHAT numbers, so the table of states is tested without a browser.
 */
export type ScreenState =
  | 'uploading'
  | 'uploaded'
  | 'validating'
  /** Checked, with errors. */
  | 'invalid'
  /** Checked, no errors: it can start. */
  | 'valid'
  /** Accepted, waiting for a worker. */
  | 'queued'
  /** A resumed job, waiting for a worker. */
  | 'resuming'
  /** The check at the start of the import (D-33). */
  | 'rechecking'
  | 'running'
  | 'completed'
  | 'stopped'
  | 'interrupted'
  | 'failed'
  | 'canceled';

export type ScreenAction =
  | 'start'
  | 'cancel'
  | 'resume'
  | 'recheck'
  | 'uploadNew'
  | 'downloadErrors'
  | 'delete';

/** Why Start or Resume cannot be pressed now (§ 8.2, § 8.3). */
export type Blocker =
  | { kind: 'importRunning'; entity: ImportEntity }
  | { kind: 'openJob'; entity: ImportEntity };

export type ScreenNote =
  | { kind: 'cancelRequested' }
  /** Waiting for a worker for too long (J4). */
  | { kind: 'notStarted' }
  /** The worker is waiting for the event queue (§ 8.5). */
  | { kind: 'waiting' }
  /** The check ran while another import was queued or running (§ 8.4). */
  | { kind: 'overlapped'; entity: ImportEntity }
  | { kind: 'recheckFoundErrors' }
  | { kind: 'pageAddresses'; rebuilt: number }
  /** The reason the server gives for a job that stopped, failed or was interrupted. */
  | { kind: 'reason'; text: string };

export type Progress =
  /** The share of the file read. Two passes: the rows, then the store. */
  | { kind: 'file'; pass: 1 | 2; percent: number }
  | { kind: 'rows'; done: number; total: number; percent: number };

export interface Screen {
  state: ScreenState;
  /** The page asks again every few seconds while this is true. */
  live: boolean;
  progress: Progress | null;
  actions: ScreenAction[];
  blockedBy: Blocker | null;
  notes: ScreenNote[];
  /** The table of problems to show, and which phase it is from. */
  problems: { phase: IssuePhase } | null;
}

export interface ScreenContext {
  /** The jobs of `GET /import-open-jobs` (this one may be among them). */
  others: readonly JobView[];
  nowMs: number;
}

/** After this long in `uploaded` or `queued` the page suspects that no worker runs (J4). */
export const NOT_STARTED_AFTER_MS = 2 * 60 * 1000;

const LIVE: readonly JobStatus[] = [
  'uploading',
  'uploaded',
  'validating',
  'queued',
  'running'
];

/** Whether the page keeps asking about a job in this status. */
export const isLive = (status: JobStatus): boolean => LIVE.includes(status);

const percentOf = (done: number, total: number): number =>
  total > 0 ? Math.min(100, Math.max(0, Math.floor((done / total) * 100))) : 0;

/**
 * The file is read twice: first for what the rows say, then against the store.
 * The percentage covers both, so the bar does not fall back to zero in the middle.
 */
export function fileProgress(job: JobView): Progress {
  if (job.stage === 'rechecking') {
    // Both passes of the check at the start count their bytes in one run.
    const { bytesRead } = job.counts;
    return {
      kind: 'file',
      pass: bytesRead > job.fileSize ? 2 : 1,
      percent: percentOf(bytesRead, job.fileSize * 2)
    };
  }
  const pass = job.stage === 'lookups' ? 2 : 1;
  const share = percentOf(job.counts.bytesRead, job.fileSize);
  return {
    kind: 'file',
    pass,
    percent: Math.floor(((pass === 2 ? 100 : 0) + share) / 2)
  };
}

export function rowProgress(job: JobView): Progress {
  const { created, updated, failed, skipped, total } = job.counts;
  const done = Math.min(total, created + updated + failed + skipped);
  return { kind: 'rows', done, total, percent: percentOf(done, total) };
}

const BUSY: readonly JobStatus[] = ['queued', 'running'];

/**
 * What holds Start or Resume back: an import at work anywhere, or (for a stopped
 * or interrupted job, which is not open) another open job of the same type.
 */
function blockerFor(job: JobView, others: readonly JobView[]): Blocker | null {
  const rest = others.filter((o) => o.uuid !== job.uuid);
  const busy = rest.find((o) => BUSY.includes(o.status));
  if (busy) return { kind: 'importRunning', entity: busy.entity };
  const open = rest.find(
    (o) => o.entity === job.entity && OPEN_STATUSES.includes(o.status)
  );
  if (open) return { kind: 'openJob', entity: open.entity };
  return null;
}

function stateOf(job: JobView): ScreenState {
  switch (job.status) {
    case 'validated':
      return job.counts.errors > 0 ? 'invalid' : 'valid';
    case 'queued':
      return job.startedAt !== null ? 'resuming' : 'queued';
    case 'running':
      return job.stage === 'rechecking' ? 'rechecking' : 'running';
    default:
      return job.status;
  }
}

/** Failed or skipped rows of the import: the file with errors has something to give. */
const hasRowProblems = (job: JobView): boolean =>
  job.counts.failed + job.counts.skipped > 0;

export function describeJob(job: JobView, context: ScreenContext): Screen {
  const state = stateOf(job);
  const phase: IssuePhase = job.startedAt === null ? 'validate' : 'import';
  const notes: ScreenNote[] = [];
  let progress: Progress | null = null;
  let actions: ScreenAction[] = [];
  let blockedBy: Blocker | null = null;
  let problems: Screen['problems'] = null;

  switch (state) {
    case 'validating':
    case 'rechecking':
      progress = fileProgress(job);
      actions = ['cancel'];
      break;
    case 'running':
      progress = rowProgress(job);
      actions = ['cancel'];
      if (job.waitingSince !== null) notes.push({ kind: 'waiting' });
      break;
    case 'queued':
    case 'resuming':
      actions = ['cancel'];
      break;
    case 'uploaded':
      actions = ['delete'];
      break;
    case 'invalid':
      actions = ['downloadErrors', 'recheck', 'uploadNew', 'delete'];
      problems = { phase };
      break;
    case 'valid':
      actions = ['start', 'recheck', 'delete'];
      blockedBy = blockerFor(job, context.others);
      // Warnings do not block the import, but they are worth reading.
      if (job.counts.warnings > 0) problems = { phase };
      break;
    case 'completed':
      actions = hasRowProblems(job) ? ['downloadErrors', 'delete'] : ['delete'];
      if (hasRowProblems(job)) problems = { phase };
      break;
    case 'stopped':
      actions = ['resume', 'downloadErrors', 'uploadNew', 'delete'];
      blockedBy = blockerFor(job, context.others);
      problems = { phase };
      break;
    case 'interrupted':
      actions = hasRowProblems(job)
        ? ['resume', 'downloadErrors', 'delete']
        : ['resume', 'delete'];
      blockedBy = blockerFor(job, context.others);
      if (hasRowProblems(job)) problems = { phase };
      break;
    case 'failed':
      actions = ['uploadNew', 'delete'];
      break;
    case 'canceled':
      actions = hasRowProblems(job) ? ['downloadErrors', 'delete'] : ['delete'];
      if (hasRowProblems(job)) problems = { phase };
      break;
    case 'uploading':
      break;
    default: {
      const never: never = state;
      throw new Error(`Unknown screen state ${String(never)}`);
    }
  }

  // There is no file with errors to give when the check could not read the whole
  // file, or when the file is not kept any more (a newer upload took its place).
  if (
    !job.fileKept ||
    READING_STOPPED_CODES.some(
      (code) => (job.counts.byCode.validate[code] ?? 0) > 0
    )
  ) {
    actions = actions.filter((a) => a !== 'downloadErrors');
  }
  if (job.cancelRequested && isLive(job.status)) {
    notes.push({ kind: 'cancelRequested' });
    actions = actions.filter((a) => a !== 'cancel');
  }
  if (
    (state === 'uploaded' || state === 'queued' || state === 'resuming') &&
    context.nowMs - Date.parse(job.statusChangedAt ?? job.createdAt ?? '') >
      NOT_STARTED_AFTER_MS
  ) {
    notes.push({ kind: 'notStarted' });
  }
  if (state === 'invalid' || state === 'valid') {
    if (job.counts.overlappedImport !== null) {
      notes.push({ kind: 'overlapped', entity: job.counts.overlappedImport });
    }
  }
  if (state === 'invalid' && job.errorMessage !== null) {
    notes.push({ kind: 'recheckFoundErrors' });
  }
  if (
    state === 'completed' &&
    (job.entity === 'product' || job.entity === 'category')
  ) {
    notes.push({ kind: 'pageAddresses', rebuilt: job.counts.pagesRebuilt });
  }
  // A stopped job's reason is always "stopped after N failed rows", which the
  // summary line already says with the rows done: not repeated in a box.
  if (
    (state === 'interrupted' || state === 'failed') &&
    job.errorMessage !== null
  ) {
    notes.push({ kind: 'reason', text: job.errorMessage });
  }

  return {
    state,
    live: isLive(job.status),
    progress,
    actions,
    blockedBy,
    notes,
    problems
  };
}

import { OPEN_STATUSES } from '../services/job/types.js';
import type { ImportEntity } from '../services/types.js';
import type { JobView } from '../web/jobView.js';
import { rowProgress } from './jobScreen.js';

/**
 * What the upload page tells the admin about the type they chose, from the jobs
 * of `GET /import-jobs/open` (§ 8.2, D-32). The page writes the words; this says
 * which notices apply, which of them need a yes first, and whether the file can
 * be sent.
 */
export type UploadNotice =
  /** An import of the type is at work: nothing can be uploaded. */
  | { kind: 'busy'; job: JobView; percent: number }
  /** An unfinished job that the new file replaces. `mine` is false for another admin's. */
  | { kind: 'replace'; job: JobView; mine: boolean }
  /** A stopped or interrupted import that wrote rows: the new file closes it. */
  | { kind: 'close'; job: JobView; rows: number };

export type FileProblem = 'empty' | 'tooLarge';

export interface UploadChoice {
  /** Customer addresses are always added (D-18): no choice of mode. */
  showMode: boolean;
  /** Only files with images have the option. */
  showCheckImages: boolean;
  notices: UploadNotice[];
  /** The notices that need a yes before the upload (D-32). */
  confirm: UploadNotice[];
  fileProblem: FileProblem | null;
  canUpload: boolean;
}

export interface UploadInput {
  entity: ImportEntity;
  openJobs: readonly JobView[];
  /** The id of the admin who is looking. */
  me: number | null;
  file: { size: number } | null;
  /** The largest file the store accepts, when it is known. */
  maxFileBytes: number | null;
  uploading: boolean;
}

/** Running, or resumed and waiting for a worker (§ 8.4). */
export const isBusy = (job: JobView): boolean =>
  job.status === 'running' ||
  (job.status === 'queued' && job.startedAt !== null);

const rowsDone = (job: JobView): number => {
  const { created, updated, failed, skipped } = job.counts;
  return created + updated + failed + skipped;
};

export function noticesFor(
  entity: ImportEntity,
  openJobs: readonly JobView[],
  me: number | null
): UploadNotice[] {
  const notices: UploadNotice[] = [];
  openJobs
    .filter((job) => job.entity === entity)
    .forEach((job) => {
      if (isBusy(job)) {
        // A resumed import that waits for a worker has already done its rows.
        notices.push({ kind: 'busy', job, percent: rowProgress(job).percent });
      } else if (job.status === 'stopped' || job.status === 'interrupted') {
        // One that never wrote anything is simply deleted: it is like an unstarted job.
        if (job.startedAt !== null) {
          notices.push({ kind: 'close', job, rows: rowsDone(job) });
        } else {
          notices.push({
            kind: 'replace',
            job,
            mine: job.createdBy?.id === me
          });
        }
      } else if (OPEN_STATUSES.includes(job.status)) {
        notices.push({ kind: 'replace', job, mine: job.createdBy?.id === me });
      }
    });
  return notices;
}

export function describeUpload(input: UploadInput): UploadChoice {
  const { entity, file, maxFileBytes } = input;
  const notices = noticesFor(entity, input.openJobs, input.me);
  let fileProblem: FileProblem | null = null;
  if (file !== null) {
    if (file.size === 0) fileProblem = 'empty';
    else if (maxFileBytes !== null && file.size > maxFileBytes) {
      fileProblem = 'tooLarge';
    }
  }
  const busy = notices.some((n) => n.kind === 'busy');
  return {
    showMode: entity !== 'customerAddress',
    showCheckImages: entity === 'category' || entity === 'product',
    notices,
    confirm: notices.filter(
      (n) => n.kind === 'close' || (n.kind === 'replace' && !n.mine)
    ),
    fileProblem,
    canUpload:
      file !== null && fileProblem === null && !busy && !input.uploading
  };
}

/** A job id that cannot be a real one, standing in the address of the page of a job. */
export const PLACEHOLDER_ID = '00000000-0000-0000-0000-000000000000';

/** The address of the page of a job, from the address of the page of the placeholder. */
export function viewUrlFor(template: string, uuid: string): string {
  if (!template.includes(PLACEHOLDER_ID)) {
    throw new Error(
      'The address of the page of a job has no place for the id.'
    );
  }
  return template.replace(PLACEHOLDER_ID, uuid);
}

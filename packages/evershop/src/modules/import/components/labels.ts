import { _ } from '@evershop/evershop/lib/locale/translate/_';
import type { JobStatus } from '../services/job/types.js';
import type { ImportEntity, ImportMode } from '../services/types.js';
import { formatBytes } from './format.js';

/** What an import is of, in the words of the admin. Every string is a literal for the translation tools. */
export function entityLabel(entity: ImportEntity): string {
  switch (entity) {
    case 'category':
      return _('Categories');
    case 'product':
      return _('Products');
    case 'customer':
      return _('Customers');
    case 'customerAddress':
      return _('Customer addresses');
    default:
      return entity;
  }
}

/** The same, in the middle of a sentence ("a products import is running"). */
export function entityNoun(entity: ImportEntity): string {
  switch (entity) {
    case 'category':
      return _('categories');
    case 'product':
      return _('products');
    case 'customer':
      return _('customers');
    case 'customerAddress':
      return _('customer addresses');
    default:
      return entity;
  }
}

/** Customer addresses are always added (D-18): they have no choice to show. */
export function modeLabel(entity: ImportEntity, mode: ImportMode): string {
  if (entity === 'customerAddress') return '--';
  switch (mode) {
    case 'upsert':
      return _('Create and update');
    case 'create':
      return _('Only create');
    case 'update':
      return _('Only update');
    default:
      return mode;
  }
}

export type BadgeTone =
  | 'success'
  | 'destructive'
  | 'secondary'
  | 'warning'
  | 'default';

export function statusLabel(status: JobStatus): string {
  switch (status) {
    case 'uploading':
      return _('Uploading');
    case 'uploaded':
      return _('Uploaded');
    case 'validating':
      return _('Checking');
    case 'validated':
      return _('Checked');
    case 'queued':
      return _('Starting');
    case 'running':
      return _('Importing');
    case 'completed':
      return _('Completed');
    case 'failed':
      return _('Failed');
    case 'stopped':
      return _('Stopped');
    case 'canceled':
      return _('Canceled');
    case 'interrupted':
      return _('Interrupted');
    default:
      return status;
  }
}

export function statusTone(
  status: JobStatus,
  errors?: number | null
): BadgeTone {
  switch (status) {
    case 'validated':
      // "Checked" says nothing about how it went: the colour does.
      return errors === undefined || errors === null
        ? 'secondary'
        : errors > 0
        ? 'destructive'
        : 'success';
    case 'completed':
      return 'success';
    case 'failed':
      return 'destructive';
    case 'stopped':
    case 'interrupted':
      return 'warning';
    case 'canceled':
      return 'secondary';
    case 'validating':
    case 'queued':
    case 'running':
    case 'uploading':
      return 'default';
    default:
      return 'secondary';
  }
}

/** What the API said when it refused a button, in the admin's language. */
export function refusalMessage(failure: {
  status: number;
  code: string | null;
  message: string;
}): string {
  switch (failure.code) {
    case 'IMPORT_ALREADY_RUNNING':
      return _('Another import is running. Only one import runs at a time.');
    case 'OPEN_JOB_EXISTS':
      return _(
        'There is another unfinished import of this type. Close it first.'
      );
    case 'FILE_HAS_ERRORS':
      return _('The file still has errors. Fix them and check again.');
    case 'WRONG_STATUS':
      return _(
        'The import is not in a state where this can be done. The page shows its current state.'
      );
    case 'FILE_UNAVAILABLE':
      return _('There is no file with errors to download for this import.');
    case 'NOT_FOUND':
      return _('This import no longer exists.');
    default:
      return failure.status === 0
        ? _('The page could not reach the server. Try again.')
        : failure.message;
  }
}

/** What the API said when an upload did not go through, in the admin's language. */
export function uploadFailureMessage(failure: {
  status: number;
  code: string | null;
  message: string;
  details?: Record<string, unknown>;
}): string {
  switch (failure.code) {
    case 'IMPORT_RUNNING':
      return _(
        'An import of this type is running. Upload a new file when it finishes, or cancel it.'
      );
    case 'FILE_TOO_LARGE':
      return typeof failure.details?.maxFileBytes === 'number'
        ? _('The file is larger than ${max}.', {
            max: formatBytes(failure.details.maxFileBytes)
          })
        : failure.message;
    default:
      return failure.status === 0
        ? _('The upload did not finish. Check your connection and try again.')
        : failure.message;
  }
}

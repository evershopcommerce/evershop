import { Button } from '@components/common/ui/Button.js';
import { Card, CardContent } from '@components/common/ui/Card.js';
import { Progress } from '@components/common/ui/Progress.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React, { useRef } from 'react';
import type { ImportEntity, ImportMode } from '../services/types.js';
import type {
  FileProblem,
  UploadChoice,
  UploadNotice
} from '../ui/uploadChoice.js';
import type { JobView } from '../web/jobView.js';
import { formatBytes, formatDateTime } from './format.js';
import { entityLabel, entityNoun, modeLabel, statusLabel } from './labels.js';
import { Notice, ToneIcon } from './Notice.js';

/** The order of the radio buttons (§ 8.2). */
export const ENTITY_CHOICES: readonly ImportEntity[] = [
  'product',
  'category',
  'customer',
  'customerAddress'
];

const MODE_CHOICES: readonly ImportMode[] = ['upsert', 'create', 'update'];

export interface NewImportViewProps {
  entity: ImportEntity;
  mode: ImportMode;
  checkImages: boolean;
  file: { name: string; size: number } | null;
  choice: UploadChoice;
  maxFileBytes: number | null;
  templateUrl: string;
  /** The time zone of the store: the times on the page are in it. */
  timeZone?: string | null;
  /** The page of a job, for the link in the notice of an import at work. */
  viewUrlOf(job: JobView): string;
  /** Set while the file is on its way. */
  upload: { percent: number } | null;
  error: string | null;
  onEntity(entity: ImportEntity): void;
  onMode(mode: ImportMode): void;
  onCheckImages(value: boolean): void;
  onFile(file: File | null): void;
  onSubmit(): void;
  onAbort(): void;
}

const who = (job: JobView) => job.createdBy?.name ?? _('Someone');

/** The text of a notice, and of the question that goes with it when it needs a yes. */
export function noticeText(
  notice: UploadNotice,
  timeZone?: string | null
): string {
  const { job } = notice;
  const what = entityNoun(job.entity);
  switch (notice.kind) {
    case 'busy':
      return _(
        'A ${what} import is running (${percent}%). You can upload a new file when it finishes, or cancel it.',
        { what, percent: `${notice.percent}` }
      );
    case 'replace':
      return _(
        'There is an unfinished ${what} import (${file}, ${state}, uploaded by ${name} at ${time}). A new upload replaces it.',
        {
          what,
          file: job.fileName,
          state: statusLabel(job.status).toLocaleLowerCase(),
          name: who(job),
          time: formatDateTime(job.createdAt, timeZone)
        }
      );
    case 'close':
      return job.status === 'stopped'
        ? _(
            'A ${what} import was stopped after ${rows} rows. Uploading closes it; the rows already written stay.',
            { what, rows: `${notice.rows}` }
          )
        : _(
            'A ${what} import was interrupted after ${rows} rows. Uploading closes it; the rows already written stay.',
            { what, rows: `${notice.rows}` }
          );
    default:
      return '';
  }
}

/** What the confirmation dialog says for a notice (D-32). */
export function confirmText(
  notice: UploadNotice,
  timeZone?: string | null
): {
  heading: string;
  content: string;
} {
  const { job } = notice;
  if (notice.kind === 'replace') {
    return {
      heading: _('Replace the earlier upload?'),
      content: _(
        '${name} uploaded ${file} at ${time}. Uploading replaces it. Continue?',
        {
          name: who(job),
          file: job.fileName,
          time: formatDateTime(job.createdAt, timeZone)
        }
      )
    };
  }
  return {
    heading: _('Close the earlier import?'),
    content: `${noticeText(notice, timeZone)} ${_('Continue?')}`
  };
}

function fileProblemText(
  problem: FileProblem,
  maxFileBytes: number | null
): string {
  return problem === 'empty'
    ? _('The file is empty.')
    : _('The file is larger than ${max}.', {
        max: formatBytes(maxFileBytes ?? 0)
      });
}

const fieldClass =
  'border-input bg-background dark:bg-input/30 h-9 rounded-md border px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

// A notice that is about to be overwritten is a warning; one that only informs is not.
const NOTICE_TONE = {
  busy: 'info',
  replace: 'warning',
  close: 'warning'
} as const;

/**
 * The page "New import" (§ 8.2): what to import, what to do with a record that
 * exists, the template, the file, and the notices about the type that was
 * chosen. It holds no state of its own except the file picker's element.
 */
export function NewImportView(props: NewImportViewProps) {
  const { entity, choice, upload } = props;
  const picker = useRef<HTMLInputElement>(null);
  const uploading = upload !== null;
  return (
    <Card>
      <CardContent className="grid min-w-0 grid-cols-1 gap-5">
        <fieldset className="grid gap-2" disabled={uploading}>
          <legend className="font-medium mb-1">
            {_('What do you want to import?')}
          </legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {ENTITY_CHOICES.map((value) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  className="accent-primary size-4"
                  type="radio"
                  name="entity"
                  value={value}
                  checked={entity === value}
                  onChange={() => props.onEntity(value)}
                />
                {entityLabel(value)}
              </label>
            ))}
          </div>
        </fieldset>

        {choice.notices.map((notice) => (
          <Notice
            key={`${notice.kind}-${notice.job.uuid}`}
            tone={NOTICE_TONE[notice.kind]}
          >
            {noticeText(notice, props.timeZone)}
            {notice.kind === 'busy' && (
              <>
                {' '}
                <a
                  href={props.viewUrlOf(notice.job)}
                  className="font-medium underline underline-offset-4"
                >
                  {_('Open it')}
                </a>
              </>
            )}
          </Notice>
        ))}

        {choice.showMode && (
          <label className="grid gap-1 text-sm">
            <span className="font-medium">
              {_('If a record already exists')}
            </span>
            <select
              aria-label={_('If a record already exists')}
              className={`${fieldClass} w-64`}
              value={props.mode}
              disabled={uploading}
              onChange={(e) => props.onMode(e.target.value as ImportMode)}
            >
              {MODE_CHOICES.map((value) => (
                <option key={value} value={value}>
                  {modeLabel(entity, value)}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid gap-1 text-sm">
          <span className="font-medium">{_('Template')}</span>
          <a
            href={props.templateUrl}
            download
            className="text-primary w-fit underline-offset-4 hover:underline"
          >
            {_('Download the ${what} template (CSV)', {
              what: entityNoun(entity)
            })}
          </a>
        </div>

        <div className="grid gap-1 text-sm">
          <span className="font-medium">{_('File')}</span>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={picker}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              aria-label={_('Choose a CSV file...')}
              disabled={uploading}
              onChange={(e) => props.onFile(e.target.files?.[0] ?? null)}
            />
            <Button
              variant="outline"
              disabled={uploading}
              onClick={() => picker.current?.click()}
            >
              {_('Choose a CSV file...')}
            </Button>
            <span className={props.file ? '' : 'text-muted-foreground'}>
              {props.file
                ? `${props.file.name} - ${formatBytes(props.file.size)}`
                : _('No file chosen')}
            </span>
          </div>
          {choice.fileProblem && (
            <p className="text-destructive flex items-center gap-1.5">
              <ToneIcon tone="error" />
              {fileProblemText(choice.fileProblem, props.maxFileBytes)}
            </p>
          )}
        </div>

        {choice.showCheckImages && (
          <label className="flex items-center gap-2 text-sm">
            <input
              className="accent-primary size-4"
              type="checkbox"
              checked={props.checkImages}
              disabled={uploading}
              onChange={(e) => props.onCheckImages(e.target.checked)}
            />
            {_(
              'Check that image URLs can be reached while validating (slower)'
            )}
          </label>
        )}

        {props.error && <Notice tone="error">{props.error}</Notice>}

        {upload && (
          <div className="grid gap-2">
            <div className="flex items-center gap-3">
              <Progress
                value={upload.percent}
                aria-label={_('Progress')}
                className="flex-1"
              />
              <span className="text-sm tabular-nums w-12 text-right">
                {upload.percent}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {upload.percent >= 100
                ? _('Finishing the upload...')
                : _('The page must stay open until the upload ends.')}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {upload ? (
            <Button variant="outline" onClick={props.onAbort}>
              {_('Cancel the upload')}
            </Button>
          ) : (
            <Button disabled={!choice.canUpload} onClick={props.onSubmit}>
              {_('Upload and validate')}
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {_(
            'Tip: import in this order - categories, products, customers, addresses.'
          )}
        </p>
      </CardContent>
    </Card>
  );
}

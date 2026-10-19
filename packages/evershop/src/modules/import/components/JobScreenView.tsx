import { Alert, AlertDescription } from '@components/common/ui/Alert.js';
import { Button, buttonVariants } from '@components/common/ui/Button.js';
import { Card, CardContent } from '@components/common/ui/Card.js';
import { Progress } from '@components/common/ui/Progress.js';
import { _ } from '@evershop/evershop/lib/locale/translate/_';
import React from 'react';
import type {
  Blocker,
  Screen,
  ScreenAction,
  ScreenNote
} from '../ui/jobScreen.js';
import type { JobView } from '../web/jobView.js';
import { formatDateTime, formatNumber } from './format.js';
import { JobStatusBadge } from './JobStatusBadge.js';
import { entityLabel, entityNoun, modeLabel } from './labels.js';

export interface JobScreenUrls {
  newImport: string;
  fileWithErrors: string;
}

export interface JobScreenViewProps {
  job: JobView;
  screen: Screen;
  /** The button that was pressed and has not been answered yet. */
  pending: ScreenAction | null;
  /** What the server said to the last button that was refused. */
  refusal: string | null;
  /** The last ask failed: what is shown may be a few seconds old. */
  stale: boolean;
  urls: JobScreenUrls;
  onAction(action: ScreenAction): void;
  /** The table of problems, when the screen has one. */
  problems?: React.ReactNode;
}

const n = (value: number) => formatNumber(value);

function Header({ job }: { job: JobView }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h2 className="text-lg font-semibold break-all">{job.fileName}</h2>
      <JobStatusBadge status={job.status} />
      <p className="text-sm text-muted-foreground w-full">
        {entityLabel(job.entity)}
        {job.entity === 'customerAddress'
          ? ''
          : ` - ${modeLabel(job.entity, job.mode)}`}
        {` - ${formatDateTime(job.createdAt)}`}
        {job.createdBy?.name
          ? ` - ${_('by ${name}', { name: job.createdBy.name })}`
          : ''}
      </p>
    </div>
  );
}

function blockerText(blocker: Blocker): string {
  return blocker.kind === 'importRunning'
    ? _('A ${what} import is running. Start this one when it finishes.', {
        what: entityNoun(blocker.entity)
      })
    : _(
        'There is another ${what} import that is not finished. Close it before you resume this one.',
        {
          what: entityNoun(blocker.entity)
        }
      );
}

function noteText(note: ScreenNote): string {
  switch (note.kind) {
    case 'cancelRequested':
      return _('Canceling: the import stops after the row it is working on.');
    case 'notStarted':
      return _(
        "The import has not started yet. If this stays, the store's background process may not be running."
      );
    case 'waiting':
      return _('Slowing down so the store stays fast...');
    case 'overlapped':
      return _(
        'This check ran while a ${what} import was running. Check again when it has finished.',
        { what: entityNoun(note.entity) }
      );
    case 'recheckFoundErrors':
      return _(
        'The file was checked again when the import was about to start, and new problems were found.'
      );
    case 'pageAddresses':
      return note.rebuilt > 0
        ? _(
            'Page addresses are finished in the background and may take a few minutes. ${count} were rebuilt after the import.',
            { count: n(note.rebuilt) }
          )
        : _(
            'Page addresses are finished in the background and may take a few minutes.'
          );
    case 'reason':
      return note.text;
    default:
      return '';
  }
}

function Lines({ job, screen }: { job: JobView; screen: Screen }) {
  const { counts } = job;
  const done = counts.created + counts.updated + counts.failed + counts.skipped;
  const result = _(
    'Created ${created} - Updated ${updated} - Failed ${failed} - Skipped ${skipped}',
    {
      created: n(counts.created),
      updated: n(counts.updated),
      failed: n(counts.failed),
      skipped: n(counts.skipped)
    }
  );
  switch (screen.state) {
    case 'uploading':
      return (
        <p>
          {_(
            'The file is still being uploaded. If the upload stops, it is deleted after 10 minutes.'
          )}
        </p>
      );
    case 'uploaded':
      return <p>{_('Waiting for the check to start...')}</p>;
    case 'validating':
      return (
        <>
          <p>
            {screen.progress?.kind === 'file' && screen.progress.pass === 2
              ? _('Checking the rows against the store...')
              : _('Reading the rows...')}
          </p>
          <p className="text-sm text-muted-foreground">
            {_('You can leave this page. The check continues on the server.')}
          </p>
        </>
      );
    case 'invalid':
      return (
        <>
          <p>
            {_(
              'The check found ${errors} errors and ${warnings} warnings in ${total} rows.',
              {
                errors: n(counts.errors),
                warnings: n(counts.warnings),
                total: n(counts.total)
              }
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {_('Fix them to continue: the import starts only on a clean file.')}
          </p>
        </>
      );
    case 'valid':
      return (
        <p>
          {_(
            'All ${total} rows are valid: ${create} to create, ${update} to update, ${warnings} warnings.',
            {
              total: n(counts.total),
              create: n(counts.createRows),
              update: n(counts.updateRows),
              warnings: n(counts.warnings)
            }
          )}
        </p>
      );
    case 'queued':
      return <p>{_('Starting...')}</p>;
    case 'resuming':
      return <p>{_('Resuming...')}</p>;
    case 'rechecking':
      return (
        <>
          <p>{_('Checking the file again before the import...')}</p>
          <p className="text-sm text-muted-foreground">
            {_('If new problems are found, nothing is written.')}
          </p>
        </>
      );
    case 'running':
      return (
        <>
          <p>
            {_('Importing... ${done} of ${total} rows', {
              done: n(Math.min(done, counts.total)),
              total: n(counts.total)
            })}
          </p>
          <p className="text-sm text-muted-foreground">{result}</p>
        </>
      );
    case 'completed':
      return (
        <p>
          {_('Done.')} {result}
        </p>
      );
    case 'stopped':
      return (
        <>
          <p>
            {_(
              'Stopped after ${failed} failed rows (${done} of ${total} rows done).',
              {
                failed: n(counts.failed),
                done: n(Math.min(done, counts.total)),
                total: n(counts.total)
              }
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {_(
              'Fix the cause, then resume: the failed rows are tried again and the import continues.'
            )}
          </p>
        </>
      );
    case 'interrupted':
      return (
        <>
          <p>
            {_(
              'The import stopped before it finished. ${done} rows were done.',
              {
                done: n(Math.min(done, counts.total))
              }
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {_('Resume continues at the last saved row.')}
          </p>
        </>
      );
    case 'failed':
      return <p>{_('The job could not run.')}</p>;
    case 'canceled':
      return (
        <p>
          {_('Canceled after ${done} rows.', {
            done: n(Math.min(done, counts.total))
          })}
        </p>
      );
    default:
      return null;
  }
}

function ProgressBar({ screen }: { screen: Screen }) {
  const { progress } = screen;
  if (progress === null) return null;
  return (
    <div className="flex items-center gap-3">
      <Progress
        value={progress.percent}
        aria-label={_('Progress')}
        className="flex-1"
      />
      <span className="text-sm tabular-nums w-12 text-right">
        {progress.percent}%
      </span>
    </div>
  );
}

const ACTION_VARIANT: Record<
  ScreenAction,
  'default' | 'outline' | 'destructive'
> = {
  start: 'default',
  resume: 'default',
  cancel: 'outline',
  recheck: 'outline',
  uploadNew: 'outline',
  downloadErrors: 'outline',
  delete: 'outline'
};

function actionLabel(action: ScreenAction): string {
  switch (action) {
    case 'start':
      return _('Start import');
    case 'cancel':
      return _('Cancel');
    case 'resume':
      return _('Resume');
    case 'recheck':
      return _('Check again');
    case 'uploadNew':
      return _('Upload a new file');
    case 'downloadErrors':
      return _('Download file with errors');
    case 'delete':
      return _('Delete');
    default:
      return action;
  }
}

function Actions({
  screen,
  pending,
  urls,
  job,
  onAction
}: Pick<
  JobScreenViewProps,
  'screen' | 'pending' | 'urls' | 'job' | 'onAction'
>) {
  if (screen.actions.length === 0) return null;
  const blocked = screen.blockedBy !== null;
  return (
    <div className="flex flex-wrap gap-2">
      {screen.actions.map((action) => {
        if (action === 'downloadErrors') {
          return (
            <a
              key={action}
              className={buttonVariants({ variant: 'outline' })}
              href={urls.fileWithErrors}
              download
            >
              {actionLabel(action)}
            </a>
          );
        }
        if (action === 'uploadNew') {
          return (
            <a
              key={action}
              className={buttonVariants({ variant: 'outline' })}
              href={urls.newImport}
            >
              {actionLabel(action)}
            </a>
          );
        }
        const gated = (action === 'start' || action === 'resume') && blocked;
        return (
          <Button
            key={action}
            variant={ACTION_VARIANT[action]}
            disabled={pending !== null || gated}
            data-action={action}
            data-job={job.uuid}
            onClick={() => onAction(action)}
          >
            {actionLabel(action)}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * The content of the page of one job (§ 8.2), for any status: what the screen
 * says, the bar, the notes, the buttons and, when the screen has one, the table
 * of problems. It holds no state: `ImportJobView` owns the polling and the actions.
 */
export function JobScreenView(props: JobScreenViewProps) {
  const { job, screen, refusal, stale, problems } = props;
  return (
    <Card>
      <CardContent className="grid gap-4">
        <Header job={job} />
        <div className="grid gap-2" data-state={screen.state}>
          <Lines job={job} screen={screen} />
          <ProgressBar screen={screen} />
        </div>
        {screen.notes.map((note) => (
          <Alert key={note.kind} variant="default">
            <AlertDescription>{noteText(note)}</AlertDescription>
          </Alert>
        ))}
        {screen.blockedBy && (
          <Alert variant="default">
            <AlertDescription>{blockerText(screen.blockedBy)}</AlertDescription>
          </Alert>
        )}
        {refusal && (
          <Alert variant="destructive">
            <AlertDescription>{refusal}</AlertDescription>
          </Alert>
        )}
        {stale && (
          <p className="text-sm text-muted-foreground">
            {_(
              'The page could not reach the server. It shows the last state it knew and will try again.'
            )}
          </p>
        )}
        <Actions
          screen={screen}
          pending={props.pending}
          urls={props.urls}
          job={job}
          onAction={props.onAction}
        />
        {problems}
      </CardContent>
    </Card>
  );
}

import { describe, expect, it } from '@jest/globals';
import type { JobStatus } from '../../../services/job/types.js';
import {
  NOT_STARTED_AFTER_MS,
  describeJob,
  fileProgress,
  isLive,
  rowProgress
} from '../../../ui/jobScreen.js';
import type { ScreenContext } from '../../../ui/jobScreen.js';
import { aJob } from '../helpers/jobViews.js';

const at = Date.parse('2026-10-19T09:01:00.000Z');
const context = (over: Partial<ScreenContext> = {}): ScreenContext => ({
  others: [],
  nowMs: at,
  ...over
});

describe('which jobs the page keeps asking about', () => {
  it.each([
    ['uploading', true],
    ['uploaded', true],
    ['validating', true],
    ['validated', false],
    ['queued', true],
    ['running', true],
    ['completed', false],
    ['failed', false],
    ['stopped', false],
    ['canceled', false],
    ['interrupted', false]
  ] as Array<[JobStatus, boolean]>)('%s: %s', (status, live) => {
    expect(isLive(status)).toBe(live);
    expect(describeJob(aJob({ status }), context()).live).toBe(live);
  });
});

describe('the state of the screen, with its buttons (§ 8.2)', () => {
  const cases: Array<
    [
      name: string,
      job: Parameters<typeof aJob>[0],
      state: string,
      actions: string[]
    ]
  > = [
    ['uploading', { status: 'uploading' }, 'uploading', []],
    ['uploaded', { status: 'uploaded' }, 'uploaded', ['delete']],
    [
      'validating',
      { status: 'validating', stage: 'reading' },
      'validating',
      ['cancel']
    ],
    [
      'validated with errors',
      { status: 'validated', counts: { errors: 3 } },
      'invalid',
      ['downloadErrors', 'recheck', 'uploadNew', 'delete']
    ],
    [
      'validated with warnings only',
      { status: 'validated', counts: { warnings: 3 } },
      'valid',
      ['start', 'recheck', 'delete']
    ],
    [
      'validated clean',
      { status: 'validated' },
      'valid',
      ['start', 'recheck', 'delete']
    ],
    ['queued', { status: 'queued' }, 'queued', ['cancel']],
    [
      'queued again after a stop',
      { status: 'queued', startedAt: '2026-10-19T09:00:40.000Z' },
      'resuming',
      ['cancel']
    ],
    [
      'running, the check at the start',
      { status: 'running', stage: 'rechecking' },
      'rechecking',
      ['cancel']
    ],
    [
      'running, writing',
      {
        status: 'running',
        stage: 'writing',
        startedAt: '2026-10-19T09:00:40.000Z'
      },
      'running',
      ['cancel']
    ],
    ['completed, clean', { status: 'completed' }, 'completed', ['delete']],
    [
      'completed with failed rows',
      { status: 'completed', counts: { failed: 2 } },
      'completed',
      ['downloadErrors', 'delete']
    ],
    [
      'completed with skipped rows',
      { status: 'completed', counts: { skipped: 1 } },
      'completed',
      ['downloadErrors', 'delete']
    ],
    [
      'stopped',
      { status: 'stopped', counts: { failed: 10 } },
      'stopped',
      ['resume', 'downloadErrors', 'uploadNew', 'delete']
    ],
    [
      'interrupted, nothing failed',
      { status: 'interrupted' },
      'interrupted',
      ['resume', 'delete']
    ],
    [
      'interrupted with failed rows',
      { status: 'interrupted', counts: { failed: 4 } },
      'interrupted',
      ['resume', 'downloadErrors', 'delete']
    ],
    ['failed', { status: 'failed' }, 'failed', ['uploadNew', 'delete']],
    ['canceled', { status: 'canceled' }, 'canceled', ['delete']],
    [
      'canceled with failed rows',
      { status: 'canceled', counts: { failed: 1 } },
      'canceled',
      ['downloadErrors', 'delete']
    ]
  ];

  it.each(cases)('%s', (_name, job, state, actions) => {
    const screen = describeJob(aJob(job), context());
    expect(screen.state).toBe(state);
    expect(screen.actions).toEqual(actions);
  });

  it('never offers Delete on a job that is at work: the API refuses it (WRONG_STATUS)', () => {
    const active: JobStatus[] = [
      'uploading',
      'validating',
      'queued',
      'running'
    ];
    active.forEach((status) => {
      expect(describeJob(aJob({ status }), context()).actions).not.toContain(
        'delete'
      );
    });
  });

  it('takes Cancel away once it was asked for, and says so', () => {
    const screen = describeJob(
      aJob({ status: 'running', stage: 'writing', cancelRequested: true }),
      context()
    );
    expect(screen.actions).toEqual([]);
    expect(screen.notes).toContainEqual({ kind: 'cancelRequested' });
  });

  it('does not talk about a cancel request on a job that is over', () => {
    const screen = describeJob(
      aJob({ status: 'canceled', cancelRequested: true }),
      context()
    );
    expect(screen.notes).not.toContainEqual({ kind: 'cancelRequested' });
  });
});

describe('the bar', () => {
  it('is the share of the file read while the rows are read', () => {
    const screen = describeJob(
      aJob({
        status: 'validating',
        stage: 'reading',
        fileSize: 1000,
        counts: { bytesRead: 250 }
      }),
      context()
    );
    expect(screen.progress).toEqual({ kind: 'file', pass: 1, percent: 12 });
  });

  it('goes on from the middle when the second pass begins, and does not fall back to zero', () => {
    const second = (bytesRead: number) =>
      fileProgress(
        aJob({
          status: 'validating',
          stage: 'lookups',
          fileSize: 1000,
          counts: { bytesRead }
        })
      );
    expect(second(0)).toEqual({ kind: 'file', pass: 2, percent: 50 });
    expect(second(500)).toEqual({ kind: 'file', pass: 2, percent: 75 });
    expect(second(1000)).toEqual({ kind: 'file', pass: 2, percent: 100 });
  });

  it('stays within 0 and 100 when the byte count passes the size or the size is not known', () => {
    const p = (fileSize: number, bytesRead: number) =>
      fileProgress(
        aJob({
          status: 'validating',
          stage: 'reading',
          fileSize,
          counts: { bytesRead }
        })
      );
    expect(p(1000, 5000)).toMatchObject({ percent: 50 });
    expect(p(0, 10)).toMatchObject({ percent: 0 });
  });

  it('shows the check at the start of the import in the same way', () => {
    const screen = describeJob(
      aJob({
        status: 'running',
        stage: 'rechecking',
        fileSize: 1000,
        counts: { bytesRead: 1000 }
      }),
      context()
    );
    expect(screen.progress).toEqual({ kind: 'file', pass: 1, percent: 50 });
  });

  it('is the rows done against the rows of the file while the import writes', () => {
    const job = aJob({
      status: 'running',
      stage: 'writing',
      counts: { total: 200, created: 40, updated: 10, failed: 3, skipped: 2 }
    });
    expect(rowProgress(job)).toEqual({
      kind: 'rows',
      done: 55,
      total: 200,
      percent: 27
    });
  });

  it('is never 100 before the job is done, and never above it for a resumed job that counted more', () => {
    expect(
      rowProgress(aJob({ counts: { total: 1000, created: 999 } })) as {
        percent: number;
      }
    ).toMatchObject({ percent: 99 });
    expect(
      rowProgress(aJob({ counts: { total: 10, created: 9, updated: 9 } }))
    ).toMatchObject({ done: 10, percent: 100 });
    expect(rowProgress(aJob({ counts: { total: 0 } }))).toMatchObject({
      done: 0,
      percent: 0
    });
  });

  it('has no bar for the states that have none', () => {
    (['validated', 'completed', 'queued', 'stopped'] as JobStatus[]).forEach(
      (status) => {
        expect(describeJob(aJob({ status }), context()).progress).toBeNull();
      }
    );
  });
});

describe('what holds Start and Resume back', () => {
  const other = (over: Parameters<typeof aJob>[0]) =>
    aJob({ uuid: 'other-uuid', ...over });

  it('is an import that is running, for Start', () => {
    const screen = describeJob(
      aJob({ status: 'validated' }),
      context({ others: [other({ entity: 'category', status: 'running' })] })
    );
    expect(screen.blockedBy).toEqual({
      kind: 'importRunning',
      entity: 'category'
    });
  });

  it('is an import that is queued, too', () => {
    const screen = describeJob(
      aJob({ status: 'validated' }),
      context({ others: [other({ entity: 'customer', status: 'queued' })] })
    );
    expect(screen.blockedBy).toEqual({
      kind: 'importRunning',
      entity: 'customer'
    });
  });

  it('is nothing when the others are only waiting for a click', () => {
    const screen = describeJob(
      aJob({ status: 'validated' }),
      context({
        others: [
          other({ entity: 'category', status: 'validated' }),
          other({ entity: 'customer', status: 'stopped' })
        ]
      })
    );
    expect(screen.blockedBy).toBeNull();
  });

  it('is not the job itself, which the list of open jobs contains', () => {
    // A checked job is open, and so is on the list: it must not hold itself back.
    const job = aJob({ status: 'validated' });
    expect(describeJob(job, context({ others: [job] })).blockedBy).toBeNull();
    const stopped = aJob({
      status: 'stopped',
      startedAt: '2026-10-19T09:00:40.000Z'
    });
    expect(
      describeJob(stopped, context({ others: [stopped] })).blockedBy
    ).toBeNull();
  });

  it('is, for Resume, also another open job of the same type', () => {
    const screen = describeJob(
      aJob({ status: 'stopped', entity: 'product' }),
      context({ others: [other({ entity: 'product', status: 'validated' })] })
    );
    expect(screen.blockedBy).toEqual({ kind: 'openJob', entity: 'product' });
  });

  it('is, for Resume, an import that runs before an open job of the same type', () => {
    const screen = describeJob(
      aJob({ status: 'interrupted', entity: 'product' }),
      context({
        others: [
          other({ entity: 'product', status: 'validated' }),
          other({ uuid: 'third', entity: 'category', status: 'running' })
        ]
      })
    );
    expect(screen.blockedBy).toEqual({
      kind: 'importRunning',
      entity: 'category'
    });
  });

  it('is nothing for the states that have neither button', () => {
    const screen = describeJob(
      aJob({ status: 'completed' }),
      context({ others: [other({ status: 'running' })] })
    );
    expect(screen.blockedBy).toBeNull();
  });
});

describe('the notes', () => {
  const kinds = (job: Parameters<typeof aJob>[0], ctx = context()) =>
    describeJob(aJob(job), ctx).notes.map((n) => n.kind);

  it('says an import has not started when it waited more than two minutes for a worker (J4)', () => {
    const waited = (ms: number, status: JobStatus = 'queued') =>
      kinds(
        { status, statusChangedAt: new Date(at - ms).toISOString() },
        context()
      );
    expect(waited(NOT_STARTED_AFTER_MS)).not.toContain('notStarted');
    expect(waited(NOT_STARTED_AFTER_MS + 1)).toContain('notStarted');
    expect(waited(NOT_STARTED_AFTER_MS + 1, 'uploaded')).toContain(
      'notStarted'
    );
    expect(waited(NOT_STARTED_AFTER_MS + 1, 'running')).not.toContain(
      'notStarted'
    );
  });

  it('says a resumed job waits for a worker, too', () => {
    expect(
      kinds({
        status: 'queued',
        startedAt: '2026-10-19T08:00:00.000Z',
        statusChangedAt: new Date(at - NOT_STARTED_AFTER_MS - 1).toISOString()
      })
    ).toContain('notStarted');
  });

  it('says the worker waits for the event queue (§ 8.5)', () => {
    expect(
      kinds({
        status: 'running',
        stage: 'writing',
        waitingSince: '2026-10-19T09:00:50.000Z'
      })
    ).toContain('waiting');
    expect(kinds({ status: 'running', stage: 'writing' })).not.toContain(
      'waiting'
    );
  });

  it('says the check ran beside another import, with its type (§ 8.4)', () => {
    const notes = describeJob(
      aJob({
        status: 'validated',
        counts: { errors: 2, overlappedImport: 'category' }
      }),
      context()
    ).notes;
    expect(notes).toContainEqual({ kind: 'overlapped', entity: 'category' });
    expect(
      kinds({ status: 'validated', counts: { overlappedImport: null } })
    ).not.toContain('overlapped');
  });

  it('says new problems were found when the import was about to start (D-33)', () => {
    expect(
      kinds({
        status: 'validated',
        counts: { errors: 2 },
        errorMessage:
          'The file has problems that were not there when it was checked.'
      })
    ).toContain('recheckFoundErrors');
    expect(kinds({ status: 'validated', counts: { errors: 2 } })).not.toContain(
      'recheckFoundErrors'
    );
  });

  it('says page addresses are finished in the background, for products and categories only', () => {
    expect(
      describeJob(
        aJob({
          status: 'completed',
          entity: 'product',
          counts: { pagesRebuilt: 4 }
        }),
        context()
      ).notes
    ).toContainEqual({ kind: 'pageAddresses', rebuilt: 4 });
    expect(kinds({ status: 'completed', entity: 'category' })).toContain(
      'pageAddresses'
    );
    expect(kinds({ status: 'completed', entity: 'customer' })).not.toContain(
      'pageAddresses'
    );
    expect(
      kinds({ status: 'completed', entity: 'customerAddress' })
    ).not.toContain('pageAddresses');
    expect(kinds({ status: 'stopped', entity: 'product' })).not.toContain(
      'pageAddresses'
    );
  });

  it('gives the reason the server states for a job that stopped, failed or was interrupted', () => {
    (['stopped', 'failed', 'interrupted'] as JobStatus[]).forEach((status) => {
      expect(
        describeJob(
          aJob({ status, errorMessage: 'The worker was stopped.' }),
          context()
        ).notes
      ).toContainEqual({ kind: 'reason', text: 'The worker was stopped.' });
    });
    expect(
      kinds({ status: 'canceled', errorMessage: 'ignored' })
    ).not.toContain('reason');
  });
});

describe('which table of problems the screen shows', () => {
  it('is the check’s before the import began to write, and the import’s after', () => {
    expect(
      describeJob(
        aJob({ status: 'validated', counts: { errors: 1 } }),
        context()
      ).problems
    ).toEqual({ phase: 'validate' });
    expect(
      describeJob(
        aJob({
          status: 'stopped',
          startedAt: '2026-10-19T09:00:40.000Z',
          counts: { failed: 10 }
        }),
        context()
      ).problems
    ).toEqual({ phase: 'import' });
  });

  it('is there for warnings, which do not block the import but are worth reading', () => {
    expect(
      describeJob(
        aJob({ status: 'validated', counts: { warnings: 2 } }),
        context()
      ).problems
    ).toEqual({ phase: 'validate' });
    expect(
      describeJob(aJob({ status: 'validated' }), context()).problems
    ).toBeNull();
  });

  it('is there for a finished job only when rows failed or were skipped', () => {
    const finished = (
      counts: NonNullable<Parameters<typeof aJob>[0]>['counts']
    ) =>
      describeJob(
        aJob({
          status: 'completed',
          startedAt: '2026-10-19T09:00:40.000Z',
          counts
        }),
        context()
      ).problems;
    expect(finished({ created: 100 })).toBeNull();
    expect(finished({ failed: 1 })).toEqual({ phase: 'import' });
    expect(finished({ skipped: 1 })).toEqual({ phase: 'import' });
  });
});

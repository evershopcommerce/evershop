import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JobScreenView } from '../../../components/JobScreenView.js';
import type { JobScreenViewProps } from '../../../components/JobScreenView.js';
import { describeJob } from '../../../ui/jobScreen.js';
import type { ScreenContext } from '../../../ui/jobScreen.js';
import { aJob } from '../helpers/jobViews.js';

const NOW = Date.parse('2026-10-19T09:01:00.000Z');

function page(
  job: Parameters<typeof aJob>[0],
  more: Partial<JobScreenViewProps> = {},
  context: Partial<ScreenContext> = {}
) {
  const view = aJob(job);
  const screen = describeJob(view, { others: [], nowMs: NOW, ...context });
  return renderToStaticMarkup(
    <JobScreenView
      job={view}
      screen={screen}
      pending={null}
      refusal={null}
      stale={false}
      urls={{
        newImport: '/admin/import/new',
        fileWithErrors: '/api/import-jobs/x/file-with-errors.csv'
      }}
      onAction={() => undefined}
      {...more}
    />
  );
}

/** The text of the page, without the tags. */
const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const buttons = (html: string) =>
  [...html.matchAll(/<button[^>]*data-action="(\w+)"[^>]*>/g)].map((m) => ({
    action: m[1],
    disabled: /\sdisabled(=|\s|>)/.test(m[0])
  }));

describe('the page of one import', () => {
  it('names the file, the type, the mode, the day and who uploaded it', () => {
    const t = text(page({ status: 'validated' }));
    expect(t).toContain('products.csv');
    expect(t).toContain('Products - Create and update');
    expect(t).toContain('by Jane');
  });

  it('does not show a mode for customer addresses: they are always added (D-18)', () => {
    const t = text(page({ entity: 'customerAddress', status: 'validated' }));
    expect(t).toContain('Customer addresses');
    expect(t).not.toContain('Create and update');
  });

  describe('while the file is checked', () => {
    it('shows the bar, what is going on, and that the page may be left', () => {
      const html = page({
        status: 'validating',
        stage: 'reading',
        fileSize: 1000,
        counts: { bytesRead: 500 }
      });
      expect(text(html)).toContain('Reading the rows...');
      expect(text(html)).toContain('You can leave this page');
      expect(text(html)).toContain('25%');
      expect(html).toContain('role="progressbar"');
      expect(buttons(html)).toEqual([{ action: 'cancel', disabled: false }]);
    });

    it('says when it checks the rows against the store (the second pass)', () => {
      const t = text(page({ status: 'validating', stage: 'lookups' }));
      expect(t).toContain('Checking the rows against the store...');
    });
  });

  describe('a file with errors', () => {
    const html = page({
      status: 'validated',
      counts: { total: 50000, errors: 690, warnings: 25 }
    });

    it('says how many, and that the import starts only on a clean file', () => {
      const t = text(html);
      expect(t).toContain(
        'The check found 690 errors and 25 warnings in 50,000 rows.'
      );
      expect(t).toContain('the import starts only on a clean file');
    });

    it('has no Start; it has the download, Check again, a new upload and Delete', () => {
      expect(buttons(html).map((b) => b.action)).toEqual(['recheck', 'delete']);
      expect(html).toContain('href="/api/import-jobs/x/file-with-errors.csv"');
      expect(html).toContain(
        'href="/admin/import/new?entity=product&amp;mode=upsert"'
      );
      expect(text(html)).toContain('Download file with errors');
      expect(text(html)).toContain('Upload a new file');
    });
  });

  describe('a clean file', () => {
    it('says what will happen and offers Start', () => {
      const html = page({
        status: 'validated',
        counts: {
          total: 50000,
          createRows: 49000,
          updateRows: 1000,
          warnings: 25
        }
      });
      expect(text(html)).toContain(
        'All 50,000 rows are valid: 49,000 to create, 1,000 to update, 25 warnings.'
      );
      expect(buttons(html)).toEqual([
        { action: 'start', disabled: false },
        { action: 'recheck', disabled: false },
        { action: 'delete', disabled: false }
      ]);
    });

    it('holds Start back, and says why, while another import runs', () => {
      const html = page(
        { status: 'validated' },
        {},
        {
          others: [
            aJob({ uuid: 'other', entity: 'category', status: 'running' })
          ]
        }
      );
      expect(buttons(html)[0]).toEqual({ action: 'start', disabled: true });
      expect(text(html)).toContain(
        'A categories import is running. Start this one when it finishes.'
      );
    });

    it('holds Resume back in the same way', () => {
      const html = page(
        {
          status: 'stopped',
          startedAt: '2026-10-19T09:00:40.000Z',
          counts: { failed: 10 }
        },
        {},
        {
          others: [
            aJob({ uuid: 'other', entity: 'category', status: 'running' })
          ]
        }
      );
      expect(buttons(html)[0]).toEqual({ action: 'resume', disabled: true });
      expect(buttons(html)[1]).toEqual({ action: 'delete', disabled: false });
    });

    it('holds every button back while one was pressed and has no answer yet', () => {
      const html = page({ status: 'validated' }, { pending: 'start' });
      expect(buttons(html).every((b) => b.disabled)).toBe(true);
    });
  });

  describe('while it imports', () => {
    const running = {
      status: 'running' as const,
      stage: 'writing' as const,
      startedAt: '2026-10-19T09:00:40.000Z',
      counts: {
        total: 49310,
        created: 17400,
        updated: 560,
        failed: 40,
        skipped: 0
      }
    };

    it('shows the rows done, the counts and the bar', () => {
      const html = page(running);
      const t = text(html);
      expect(t).toContain('Importing... 18,000 of 49,310 rows');
      expect(t).toContain(
        'Created 17,400 - Updated 560 - Failed 40 - Skipped 0'
      );
      expect(t).toContain('36%');
    });

    it('says it slows down for the store while it waits for the event queue', () => {
      const t = text(
        page({ ...running, waitingSince: '2026-10-19T09:00:50.000Z' })
      );
      expect(t).toContain('Slowing down so the store stays fast...');
    });

    it('shows the check at the start of the import with its own words', () => {
      const t = text(page({ status: 'running', stage: 'rechecking' }));
      expect(t).toContain('Checking the file again before the import...');
      expect(t).toContain('If new problems are found, nothing is written.');
    });

    it('has Cancel, and none once Cancel was asked for', () => {
      expect(buttons(page(running)).map((b) => b.action)).toEqual(['cancel']);
      const html = page({ ...running, cancelRequested: true });
      expect(buttons(html)).toEqual([]);
      expect(text(html)).toContain(
        'Canceling: the import stops after the row it is working on.'
      );
    });
  });

  it('warns when an import waited for a worker for more than two minutes (J4)', () => {
    const t = text(
      page({
        status: 'queued',
        statusChangedAt: new Date(NOW - 3 * 60 * 1000).toISOString()
      })
    );
    expect(t).toContain('Starting...');
    expect(t).toContain('The import has not started yet.');
    expect(t).toContain("the store's background process may not be running");
  });

  describe('when it ended', () => {
    it('completed: the result, the note about page addresses, and the file with errors for failed rows', () => {
      const html = page({
        status: 'completed',
        startedAt: '2026-10-19T09:00:40.000Z',
        counts: {
          total: 100,
          created: 90,
          updated: 7,
          failed: 3,
          pagesRebuilt: 0
        }
      });
      const t = text(html);
      expect(t).toContain(
        'Done. Created 90 - Updated 7 - Failed 3 - Skipped 0'
      );
      // said for someone who has never heard of events or a queue
      expect(t).toContain(
        'The web addresses (links) of the items you imported are still being set up in the background. For a large file this can take a few minutes. If a page does not open yet, try again later.'
      );
      expect(t).not.toContain('were missing');
      expect(html).toContain('/file-with-errors.csv');
    });

    it('completed, with page addresses rebuilt by the import (IMP-08)', () => {
      const t = text(
        page({
          status: 'completed',
          startedAt: '2026-10-19T09:00:40.000Z',
          counts: { total: 10, created: 10, pagesRebuilt: 4 }
        })
      );
      expect(t).toContain(
        'If a page does not open yet, try again later. 4 of these addresses were missing when the import ended and are being set up now.'
      );
      expect(t).not.toContain('rebuilt');
    });

    it('stopped: how far it got, how to go on, and the buttons for it', () => {
      const html = page({
        status: 'stopped',
        startedAt: '2026-10-19T09:00:40.000Z',
        errorMessage: 'Stopped after 10 failed rows.',
        counts: { total: 49900, created: 31190, failed: 10 }
      });
      const t = text(html);
      expect(t).toContain(
        'Stopped after 10 failed rows (31,200 of 49,900 rows done).'
      );
      expect(t).toContain('the failed rows are tried again');
      expect(buttons(html).map((b) => b.action)).toEqual(['resume', 'delete']);
    });

    it('interrupted: how many rows were done, and Resume', () => {
      const html = page({
        status: 'interrupted',
        startedAt: '2026-10-19T09:00:40.000Z',
        counts: { total: 50000, created: 31200 }
      });
      expect(text(html)).toContain(
        'The import stopped before it finished. 31,200 rows were done.'
      );
      expect(buttons(html)[0]).toEqual({ action: 'resume', disabled: false });
    });

    it('failed: the reason the server gives, and a new upload', () => {
      const html = page({
        status: 'failed',
        errorMessage: 'The file could not be read.'
      });
      expect(text(html)).toContain('The job could not run.');
      expect(text(html)).toContain('The file could not be read.');
      expect(html).toContain(
        'href="/admin/import/new?entity=product&amp;mode=upsert"'
      );
    });

    it('canceled: how far it got', () => {
      const t = text(
        page({
          status: 'canceled',
          startedAt: '2026-10-19T09:00:40.000Z',
          counts: { total: 20000, created: 12000 }
        })
      );
      expect(t).toContain('Canceled after 12,000 rows.');
    });
  });

  it('says the file was checked again when the import was about to start, and found new problems (D-33)', () => {
    const t = text(
      page({
        status: 'validated',
        counts: { errors: 2 },
        errorMessage:
          'The file has problems that were not there when it was checked.'
      })
    );
    expect(t).toContain(
      'The file was checked again when the import was about to start, and new problems were found.'
    );
  });

  it('says the check ran beside another import (§ 8.4)', () => {
    const t = text(
      page({
        status: 'validated',
        counts: { errors: 5, overlappedImport: 'category' }
      })
    );
    expect(t).toContain(
      'This check ran while a categories import was running. Check again when it has finished.'
    );
  });

  it('shows what the server refused, and that the shown state may be old', () => {
    const t = text(
      page(
        { status: 'validated' },
        { refusal: 'Another import is running.', stale: true }
      )
    );
    expect(t).toContain('Another import is running.');
    expect(t).toContain('shows the last state it knew');
  });

  it('puts the table of problems below the buttons when there is one', () => {
    const html = page(
      { status: 'validated', counts: { errors: 1 } },
      { problems: <div id="the-table">table</div> }
    );
    expect(html.indexOf('data-action="delete"')).toBeLessThan(
      html.indexOf('id="the-table"')
    );
  });
});

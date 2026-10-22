import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JobScreenView } from '../../../components/JobScreenView.js';
import type { JobScreenViewProps } from '../../../components/JobScreenView.js';
import { Notice } from '../../../components/Notice.js';
import { NewImportView } from '../../../components/NewImportView.js';
import { statusTone } from '../../../components/labels.js';
import { describeJob } from '../../../ui/jobScreen.js';
import type { ScreenAction } from '../../../ui/jobScreen.js';
import { describeUpload } from '../../../ui/uploadChoice.js';
import { aJob } from '../helpers/jobViews.js';

/**
 * The colours of the states on the screens of the import: what is good is green,
 * what needs the admin is amber, what failed is red and what only informs is
 * grey; the one button that cannot be undone is red and apart from the others.
 */
const NOW = Date.parse('2026-10-19T09:01:00.000Z');

function job(
  over: Parameters<typeof aJob>[0],
  more: Partial<JobScreenViewProps> = {}
) {
  const view = aJob(over);
  return renderToStaticMarkup(
    <JobScreenView
      job={view}
      screen={describeJob(view, { others: [], nowMs: NOW })}
      pending={null}
      refusal={null}
      stale={false}
      urls={{ newImport: '/new', fileWithErrors: '/errors.csv' }}
      onAction={() => undefined}
      {...more}
    />
  );
}

const leadTone = (html: string) =>
  html.match(/<p class="flex items-start[^"]*"[^>]*data-tone="(\w+)"/)?.[1] ??
  null;
const toneOfNotices = (html: string) =>
  [...html.matchAll(/data-slot="alert"[^>]*data-tone="(\w+)"/g)].map(
    (m) => m[1]
  );

describe('the colour of the result of a job', () => {
  it.each([
    [
      'a checked file with errors is red',
      { status: 'validated', counts: { errors: 3 } },
      'error'
    ],
    [
      'a checked file with no errors is green',
      { status: 'validated', counts: { errors: 0, warnings: 4 } },
      'success'
    ],
    [
      'a completed import is green',
      { status: 'completed', counts: { created: 10 } },
      'success'
    ],
    [
      'a completed import with failed rows is amber',
      { status: 'completed', counts: { created: 8, failed: 2 } },
      'warning'
    ],
    [
      'a stopped import is amber: the admin has something to do',
      { status: 'stopped', counts: { failed: 10 } },
      'warning'
    ],
    ['an interrupted import is amber', { status: 'interrupted' }, 'warning'],
    ['a failed job is red', { status: 'failed' }, 'error']
  ] as Array<[string, Parameters<typeof aJob>[0], string]>)(
    '%s',
    (_name, over, tone) => {
      expect(leadTone(job(over))).toBe(tone);
    }
  );

  it.each([
    ['running', { status: 'running' }],
    ['checking', { status: 'validating', stage: 'reading' }],
    ['canceled', { status: 'canceled' }]
  ] as Array<[string, Parameters<typeof aJob>[0]]>)(
    'has no colour while the job is %s: nothing was decided yet, or nothing happened',
    (_name, over) => {
      expect(leadTone(job(over))).toBeNull();
    }
  );

  it('colours the badge of a checked file by what the check found', () => {
    expect(statusTone('validated', 3)).toBe('destructive');
    expect(statusTone('validated', 0)).toBe('success');
    expect(statusTone('validated')).toBe('secondary');
    expect(statusTone('validated', null)).toBe('secondary');
    // the other states do not depend on it
    expect(statusTone('completed', 5)).toBe('success');
    expect(statusTone('failed', 0)).toBe('destructive');
  });
});

describe('the notices of a job', () => {
  it('say what they are by colour and shape: a failure is red, something to do is amber, the rest is grey', () => {
    expect(
      toneOfNotices(job({ status: 'failed', errorMessage: 'It failed.' }))
    ).toEqual(['error']);
    expect(
      toneOfNotices(job({ status: 'interrupted', errorMessage: 'It stopped.' }))
    ).toEqual(['warning']);
    expect(
      toneOfNotices(
        job({ status: 'validated', counts: { overlappedImport: 'category' } })
      )
    ).toEqual(['warning']);
    expect(
      toneOfNotices(
        job({
          status: 'validated',
          errorMessage: 'Found new problems.',
          counts: { errors: 1 }
        })
      )
    ).toEqual(['error']);
    expect(toneOfNotices(job({ status: 'completed' }))).toEqual(['info']);
  });

  it('does not say again, in a box, why a stopped import stopped: the line above says it', () => {
    const html = job({
      status: 'stopped',
      counts: { failed: 10 },
      errorMessage: 'Stopped after 10 failed rows.'
    });
    expect(toneOfNotices(html)).toEqual([]);
    expect(html.match(/Stopped after 10 failed rows/g)).toHaveLength(1);
  });

  it('announces an error at once and the others when the reader gets to them', () => {
    const error = renderToStaticMarkup(<Notice tone="error">No.</Notice>);
    const info = renderToStaticMarkup(<Notice tone="info">Maybe.</Notice>);
    expect(error).toContain('role="alert"');
    expect(info).toContain('role="status"');
    expect(info).not.toContain('role="alert"');
  });

  it('gives each tone a border of its own colour: a bare border is the colour of the text, which is black', () => {
    for (const tone of ['info', 'warning', 'success', 'error'] as const) {
      const html = renderToStaticMarkup(<Notice tone={tone}>Text.</Notice>);
      expect(html).toMatch(
        /class="[^"]*\bborder-(border|amber|green|destructive)/
      );
    }
  });

  it('shows what the server refused as an error, and a page that may be old as a warning', () => {
    expect(
      toneOfNotices(job({ status: 'validated' }, { refusal: 'Not now.' }))
    ).toContain('error');
    expect(
      toneOfNotices(job({ status: 'validated' }, { stale: true }))
    ).toEqual(['warning']);
  });
});

describe('the buttons of a job', () => {
  const button = (html: string, action: string) =>
    html.match(new RegExp(`<button[^>]*data-action="${action}"[^>]*>`))?.[0] ??
    '';

  it('keeps the one button that cannot be undone red and apart, at the end of the row', () => {
    const html = job({ status: 'completed' });
    const del = button(html, 'delete');
    expect(del).toContain('text-destructive');
    expect(del).toContain('ml-auto');
    expect(button(job({ status: 'validated' }), 'start')).not.toContain(
      'ml-auto'
    );
  });

  it('has one button in the colour of the page, the one that goes forward', () => {
    const html = job({ status: 'validated', counts: { errors: 0 } });
    expect(button(html, 'start')).toContain('bg-primary');
    for (const other of ['recheck', 'delete']) {
      expect(button(html, other)).not.toContain('bg-primary');
    }
  });

  it('shows the button that was pressed at work, with its words, and locks the others', () => {
    const view = aJob({ status: 'validated', counts: { errors: 0 } });
    const html = renderToStaticMarkup(
      <JobScreenView
        job={view}
        screen={describeJob(view, { others: [], nowMs: NOW })}
        pending={'start' as ScreenAction}
        refusal={null}
        stale={false}
        urls={{ newImport: '/new', fileWithErrors: '/errors.csv' }}
        onAction={() => undefined}
      />
    );
    const start = html.match(
      /<button[^>]*data-action="start"[^>]*>.*?<\/button>/
    )?.[0] as string;
    expect(start).toMatch(/\sdisabled(=|\s|>)/);
    expect(start).toContain('animate-spin');
    // the spinner is for the eye: the name of the button stays its words
    expect(start).toContain('aria-hidden="true"');
    expect(start.replace(/<[^>]*>/g, '')).toBe('Start import');
    expect(button(html, 'recheck')).toMatch(/\sdisabled(=|\s|>)/);
    expect(button(html, 'recheck')).not.toContain('animate-spin');
  });
});

describe('the notices of the page of a new import', () => {
  const page = (
    openJobs: Array<ReturnType<typeof aJob>>,
    entity: 'product' | 'customer' = 'product'
  ) =>
    renderToStaticMarkup(
      <NewImportView
        entity={entity}
        mode="upsert"
        checkImages={false}
        file={null}
        choice={describeUpload({
          entity,
          openJobs,
          me: 1,
          file: null,
          maxFileBytes: 1_000_000,
          uploading: false
        })}
        maxFileBytes={1_000_000}
        templateUrl="/template"
        viewUrlOf={(j) => `/view/${j.uuid}`}
        upload={null}
        error={null}
        onEntity={() => undefined}
        onMode={() => undefined}
        onCheckImages={() => undefined}
        onFile={() => undefined}
        onSubmit={() => undefined}
        onAbort={() => undefined}
      />
    );

  it('warns that an upload replaces or closes an earlier one, and only informs that one is running', () => {
    expect(toneOfNotices(page([aJob({ status: 'validated' })]))).toEqual([
      'warning'
    ]);
    expect(
      toneOfNotices(
        page([
          aJob({
            status: 'stopped',
            counts: { created: 3 }
          })
        ])
      )
    ).toEqual(['warning']);
    expect(
      toneOfNotices(
        page(
          [
            aJob({
              entity: 'customer',
              status: 'running',
              counts: { total: 10 }
            })
          ],
          'customer'
        )
      )
    ).toEqual(['info']);
  });

  it('draws the choices in the colour of the admin, and the template link too', () => {
    const html = page([]);
    // all four radios, and the box of the images (the blue of the browser is not the colour of the admin)
    expect(
      html.match(/<input[^>]*class="accent-primary[^"]*"[^>]*type="radio"/g)
    ).toHaveLength(4);
    expect(
      html.match(/<input[^>]*class="accent-primary[^"]*"[^>]*type="checkbox"/g)
    ).toHaveLength(1);
    expect(html).toMatch(/<a[^>]*href="\/template"[^>]*text-primary/);
  });
});

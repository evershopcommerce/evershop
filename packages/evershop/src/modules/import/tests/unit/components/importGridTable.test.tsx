import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImportGridTable } from '../../../components/ImportGridTable.js';
import type {
  GridJob,
  ImportGridTableProps
} from '../../../components/ImportGridTable.js';

const job = (over: Partial<GridJob> = {}): GridJob => ({
  uuid: 'job-1',
  entity: 'product',
  mode: 'upsert',
  status: 'completed',
  fileName: 'products.csv',
  counts: { total: 50000, created: 48900, updated: 1000, failed: 3 },
  createdByName: 'Jane',
  createdAt: { text: '2026-10-13 15:02' },
  viewUrl: '/admin/import/job-1',
  active: false,
  ...over
});

function render(more: Partial<ImportGridTableProps> = {}) {
  return renderToStaticMarkup(
    <ImportGridTable
      jobs={[job()]}
      currentFilters={[]}
      filters={{ status: '', entity: '', file: '' }}
      selected={[]}
      onSelect={() => undefined}
      onFilter={() => undefined}
      onClear={() => undefined}
      onDelete={() => undefined}
      {...more}
    />
  );
}

const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('the table of past imports (spec 8.1)', () => {
  it('has the columns of the spec', () => {
    const t = text(render());
    [
      'Date',
      'File',
      'Type',
      'Mode',
      'Status',
      'Rows',
      'Created',
      'Updated',
      'Failed',
      'By'
    ].forEach((title) =>
      expect(t.toUpperCase()).toContain(title.toUpperCase())
    );
  });

  it('shows a row: date, file as a link to its page, type, mode, status, the numbers and who', () => {
    const html = render();
    const t = text(html);
    expect(t).toContain('2026-10-13 15:02');
    expect(html).toContain('<a href="/admin/import/job-1"');
    expect(t).toContain('products.csv');
    expect(t).toContain('Products');
    expect(t).toContain('Create and update');
    expect(t).toContain('Completed');
    expect(t).toContain('50,000');
    expect(t).toContain('48,900');
    expect(t).toContain('1,000');
    expect(t).toContain('Jane');
  });

  it('shows -- for what is not known yet: counts that were not made, no date, no user', () => {
    const t = text(
      render({
        jobs: [
          job({
            counts: {},
            createdAt: null,
            createdByName: null,
            status: 'validating'
          })
        ]
      })
    );
    expect(t.match(/--/g)!.length).toBeGreaterThanOrEqual(6);
  });

  it('has no mode for customer addresses', () => {
    const t = text(
      render({ jobs: [job({ entity: 'customerAddress', mode: 'upsert' })] })
    );
    expect(t).toContain('Customer addresses');
    expect(t).not.toContain('Create and update');
  });

  it('shows the failed rows as a number, 0 included', () => {
    const t = text(
      render({
        jobs: [job({ counts: { total: 1, created: 1, updated: 0, failed: 0 } })]
      })
    );
    expect(t).toMatch(/1 1 0 0/);
  });

  it('says there is no import yet, and how to make one', () => {
    const t = text(render({ jobs: [] }));
    expect(t).toContain('No import yet.');
  });

  describe('the checkboxes', () => {
    const checkbox = (html: string, label: string) =>
      html.match(new RegExp(`<[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? '';
    // The attributes of the element, not its class names (which list `disabled:` styles).
    const isDisabled = (tag: string) =>
      /\sdata-disabled=""|aria-disabled="true"/.test(tag);
    const isChecked = (tag: string) => tag.includes('aria-checked="true"');

    it('a job at work cannot be chosen: it cannot be deleted', () => {
      const html = render({
        jobs: [
          job({ uuid: 'a', fileName: 'a.csv', active: true, status: 'running' })
        ]
      });
      expect(isDisabled(checkbox(html, 'Select a.csv'))).toBe(true);
    });

    it('a job that is over can', () => {
      const html = render({ jobs: [job({ uuid: 'a', fileName: 'a.csv' })] });
      expect(isDisabled(checkbox(html, 'Select a.csv'))).toBe(false);
    });

    it('select all is held when nothing can be deleted, and is not ticked for nothing', () => {
      const html = render({
        jobs: [job({ active: true, status: 'running' })]
      });
      expect(isDisabled(checkbox(html, 'Select all'))).toBe(true);
      expect(isChecked(checkbox(html, 'Select all'))).toBe(false);
    });

    it('select all is free when something can be deleted', () => {
      expect(isDisabled(checkbox(render(), 'Select all'))).toBe(false);
    });

    it('select all is ticked when every row that can be deleted is chosen, and not before', () => {
      const jobs = [
        job({ uuid: 'a', fileName: 'a.csv' }),
        job({ uuid: 'b', fileName: 'b.csv' }),
        job({ uuid: 'c', fileName: 'c.csv', active: true, status: 'running' })
      ];
      expect(
        isChecked(checkbox(render({ jobs, selected: [] }), 'Select all'))
      ).toBe(false);
      expect(
        isChecked(checkbox(render({ jobs, selected: ['a'] }), 'Select all'))
      ).toBe(false);
      expect(
        isChecked(
          checkbox(render({ jobs, selected: ['a', 'b'] }), 'Select all')
        )
      ).toBe(true);
    });

    it('the chosen row is marked', () => {
      const html = render({
        jobs: [
          job({ uuid: 'a', fileName: 'a.csv' }),
          job({ uuid: 'b', fileName: 'b.csv' })
        ],
        selected: ['b']
      });
      expect(checkbox(html, 'Select b.csv')).toContain('aria-checked="true"');
      expect(checkbox(html, 'Select a.csv')).toContain('aria-checked="false"');
    });
  });

  it('offers Delete only when something is chosen', () => {
    expect(text(render())).not.toContain('Delete');
    expect(text(render({ selected: ['job-1'] }))).toContain('Delete');
  });

  it('shows the filters as they are', () => {
    const html = render({
      filters: { status: 'stopped', entity: 'customer', file: 'spring' }
    });
    expect(html).toMatch(
      /aria-label="Status"[^>]*>\s*<span data-slot="select-value"[^>]*>Stopped</
    );
    expect(html).toMatch(
      /aria-label="Type"[^>]*>\s*<span data-slot="select-value"[^>]*>Customers</
    );
    expect(html).toContain('value="spring"');
  });
});

import { describe, expect, it } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  NewImportView,
  confirmText,
  noticeText
} from '../../../components/NewImportView.js';
import type { NewImportViewProps } from '../../../components/NewImportView.js';
import { describeUpload } from '../../../ui/uploadChoice.js';
import type { UploadInput } from '../../../ui/uploadChoice.js';
import { aJob } from '../helpers/jobViews.js';

const MB = 1_048_576;

function page(
  inputs: Partial<UploadInput> = {},
  more: Partial<NewImportViewProps> = {}
) {
  const input: UploadInput = {
    entity: 'product',
    openJobs: [],
    me: 1,
    file: null,
    maxFileBytes: 100 * MB,
    uploading: false,
    ...inputs
  };
  return renderToStaticMarkup(
    <NewImportView
      entity={input.entity}
      mode="upsert"
      checkImages={false}
      file={input.file ? { name: 'products.csv', size: input.file.size } : null}
      choice={describeUpload(input)}
      maxFileBytes={input.maxFileBytes}
      templateUrl={`/api/import-templates/${input.entity}`}
      viewUrlOf={(job) => `/admin/import/${job.uuid}`}
      upload={null}
      error={null}
      onEntity={() => undefined}
      onMode={() => undefined}
      onCheckImages={() => undefined}
      onFile={() => undefined}
      onSubmit={() => undefined}
      onAbort={() => undefined}
      {...more}
    />
  );
}

const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

// The opening tag of the first element with this role.
const tagOf = (html: string, role: string) =>
  new RegExp(`<[a-z]+[^>]*role="${role}"[^>]*>`).exec(html)?.[0] ?? '';

// The radios of the core: a `role="radio"` element named by its label, in the order drawn.
const radios = (html: string) =>
  [...html.matchAll(/<span[^>]*role="radio"[^>]*>/g)].map((m) => ({
    name: /aria-label="([^"]*)"/.exec(m[0])?.[1],
    checked: /aria-checked="true"/.test(m[0])
  }));

const primary = (html: string) => {
  const m = html.match(/<button[^>]*>\s*Upload and validate\s*<\/button>/);
  return m ? { disabled: /\sdisabled(=|\s|>)/.test(m[0]) } : null;
};

describe('the page New import', () => {
  it('asks what to import, in the order of the spec, with the chosen type marked', () => {
    const html = page({ entity: 'category' });
    expect(radios(html)).toEqual([
      { name: 'Products', checked: false },
      { name: 'Categories', checked: true },
      { name: 'Customers', checked: false },
      { name: 'Customer addresses', checked: false }
    ]);
    const t = text(html);
    expect(t.indexOf('Products')).toBeLessThan(t.indexOf('Categories'));
    expect(t.indexOf('Categories')).toBeLessThan(t.indexOf('Customers'));
    expect(t).toContain('What do you want to import?');
  });

  it('offers the three modes, and the choice to check images, for products', () => {
    const html = page({ entity: 'product' });
    // the list of modes is closed here (the page that opens it is tested whole, in importNewForm)
    expect(tagOf(html, 'combobox')).toContain('id="import-mode"');
    expect(text(html)).toContain('Create and update');
    expect(text(html)).toContain(
      'Check that image URLs can be reached while validating (slower)'
    );
  });

  it('has no mode for customer addresses: they are always added', () => {
    const t = text(page({ entity: 'customerAddress' }));
    expect(t).not.toContain('If a record already exists');
    expect(t).not.toContain('Create and update');
  });

  it('has no image check for customers', () => {
    const t = text(page({ entity: 'customer' }));
    expect(t).toContain('If a record already exists');
    expect(t).not.toContain('Check that image URLs');
  });

  it('links the template of the chosen type', () => {
    const html = page({ entity: 'customer' });
    expect(html).toContain('href="/api/import-templates/customer"');
    expect(text(html)).toContain('Download the customers template (CSV)');
  });

  it('shows the file, its size, and the tip about the order', () => {
    const t = text(page({ file: { size: 12.4 * MB } }));
    expect(t).toContain('products.csv - 12.4 MB');
    expect(t).toContain(
      'Tip: import in this order - categories, products, customers, addresses.'
    );
    expect(text(page())).toContain('No file chosen');
  });

  describe('the button', () => {
    it('is held without a file', () => {
      expect(primary(page())).toEqual({ disabled: true });
    });

    it('is free with a file', () => {
      expect(primary(page({ file: { size: 100 } }))).toEqual({
        disabled: false
      });
    });

    it('is held while an import of the type is at work', () => {
      const busy = aJob({
        status: 'running',
        stage: 'writing',
        counts: { total: 100, created: 36 }
      });
      expect(primary(page({ file: { size: 100 }, openJobs: [busy] }))).toEqual({
        disabled: true
      });
    });
  });

  describe('the file is refused before it is sent', () => {
    it('empty', () => {
      const html = page({ file: { size: 0 } });
      expect(text(html)).toContain('The file is empty.');
      expect(primary(html)).toEqual({ disabled: true });
    });

    it('too large, with the limit', () => {
      const html = page({ file: { size: 101 * MB } });
      expect(text(html)).toContain('The file is larger than 100 MB.');
      expect(primary(html)).toEqual({ disabled: true });
    });
  });

  describe('the notices (§ 8.2)', () => {
    it('an import at work: how far it is, and a link to its page to cancel it', () => {
      const job = aJob({
        uuid: 'busy-1',
        status: 'running',
        stage: 'writing',
        counts: { total: 100, created: 36 }
      });
      const html = page({ openJobs: [job] });
      expect(text(html)).toContain(
        'A products import is running (36%). You can upload a new file when it finishes, or cancel it.'
      );
      expect(html).toContain('href="/admin/import/busy-1"');
    });

    it('my own unfinished job: what it is and that a new upload replaces it', () => {
      const job = aJob({
        status: 'validated',
        fileName: 'old.csv',
        createdBy: { id: 1, name: 'Jane' }
      });
      const t = text(page({ openJobs: [job] }));
      expect(t).toContain(
        'There is an unfinished products import (old.csv, checked, uploaded by Jane at'
      );
      expect(t).toContain('A new upload replaces it.');
      expect(t).not.toContain('Open it');
    });

    it('says someone uploaded it when the admin was deleted', () => {
      const job = aJob({ status: 'uploaded', createdBy: null });
      expect(text(page({ openJobs: [job] }))).toContain(
        'uploaded by Someone at'
      );
    });

    it('a stopped import', () => {
      const job = aJob({
        status: 'stopped',
        startedAt: '2026-10-19T09:00:40.000Z',
        counts: { created: 11990, failed: 10 }
      });
      expect(text(page({ openJobs: [job] }))).toContain(
        'A products import was stopped after 12000 rows. Uploading closes it; the rows already written stay.'
      );
    });

    it('an interrupted import', () => {
      const job = aJob({
        status: 'interrupted',
        startedAt: '2026-10-19T09:00:40.000Z',
        counts: { created: 500 }
      });
      expect(text(page({ openJobs: [job] }))).toContain(
        'A products import was interrupted after 500 rows.'
      );
    });

    it('nothing for another type', () => {
      const job = aJob({ entity: 'category', status: 'running' });
      expect(text(page({ entity: 'product', openJobs: [job] }))).not.toContain(
        'import is running'
      );
    });
  });

  describe('the questions (D-32)', () => {
    it('for another admin’s upload: who, which file, when, and that it is replaced', () => {
      const job = aJob({
        status: 'validated',
        fileName: 'theirs.csv',
        createdBy: { id: 2, name: 'Omar' }
      });
      const { heading, content } = confirmText({
        kind: 'replace',
        job,
        mine: false
      });
      expect(heading).toBe('Replace the earlier upload?');
      expect(content).toMatch(
        /^Omar uploaded theirs\.csv at .+\. Uploading replaces it\. Continue\?$/
      );
    });

    it('for a stopped import: how many rows were written, and that they stay', () => {
      const job = aJob({
        status: 'stopped',
        startedAt: '2026-10-19T09:00:40.000Z'
      });
      const { heading, content } = confirmText({
        kind: 'close',
        job,
        rows: 12000
      });
      expect(heading).toBe('Close the earlier import?');
      expect(content).toBe(
        'A products import was stopped after 12000 rows. Uploading closes it; the rows already written stay. Continue?'
      );
    });

    it('has a text for every kind of notice', () => {
      const job = aJob({});
      expect(noticeText({ kind: 'busy', job, percent: 5 })).not.toBe('');
      expect(noticeText({ kind: 'replace', job, mine: true })).not.toBe('');
      expect(noticeText({ kind: 'close', job, rows: 1 })).not.toBe('');
    });
  });

  describe('while the file is on its way', () => {
    it('shows the bar and that the page must stay open, and Cancel instead of the button', () => {
      const html = page(
        { file: { size: 100 }, uploading: true },
        { upload: { percent: 41 } }
      );
      const t = text(html);
      expect(t).toContain('41%');
      expect(t).toContain('The page must stay open until the upload ends.');
      expect(t).toContain('Cancel the upload');
      expect(primary(html)).toBeNull();
      expect(html).toContain('role="progressbar"');
    });

    it('does not say it is finishing before the last byte', () => {
      const t = text(
        page(
          { file: { size: 100 }, uploading: true },
          { upload: { percent: 99 } }
        )
      );
      expect(t).toContain('The page must stay open until the upload ends.');
      expect(t).not.toContain('Finishing the upload...');
    });

    it('says it is finishing at 100 %', () => {
      const t = text(
        page(
          { file: { size: 100 }, uploading: true },
          { upload: { percent: 100 } }
        )
      );
      expect(t).toContain('Finishing the upload...');
      expect(t).not.toContain('The page must stay open');
    });

    it('holds the choices', () => {
      const html = page(
        { file: { size: 100 }, uploading: true },
        { upload: { percent: 10 } }
      );
      expect(tagOf(html, 'radiogroup')).toContain('aria-disabled="true"');
      expect(tagOf(html, 'combobox')).toContain(' disabled=""');
      expect(tagOf(html, 'checkbox')).toContain('aria-disabled="true"');
      expect(html).toMatch(/<input[^>]*type="file"[^>]*\sdisabled=""/);
    });
  });

  it('shows what went wrong', () => {
    expect(
      text(page({}, { error: 'The file is larger than 100 MB.' }))
    ).toContain('The file is larger than 100 MB.');
  });
});

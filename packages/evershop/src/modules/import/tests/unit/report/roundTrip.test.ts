import { describe, it, expect } from '@jest/globals';
import {
  categoryFile,
  categoryRow
} from '../../../services/rules/categoryFiles.js';
import { fileWithErrors } from '../../../services/report/fileWithErrors.js';
import { runImport, runValidation } from '../../../services/runner/index.js';
import type { Harness } from '../helpers/harness.js';
import { harness } from '../helpers/harness.js';

const named = (url_key: string, parent = '', more = {}) =>
  categoryRow({ url_key, name: url_key.toUpperCase(), parent, ...more });

async function download(
  h: Harness,
  jobId: number,
  phase: 'validate' | 'import'
): Promise<string> {
  const job = h.jobs.snapshot(jobId);
  let text = '';
  for await (const chunk of fileWithErrors({
    entity: job.entity,
    source: h.files.open(jobId),
    issues: h.jobs.issuesInRowOrder(jobId, phase),
    firstUnlistedRow: job.counts.firstUnlistedRow[phase]
  })) {
    text += chunk;
  }
  return text;
}

/** What identifies a problem, whatever job it is stored for. */
const shape = (issues: ReturnType<Harness['jobs']['issues']>) =>
  issues.map(({ rowNumber, column, code, severity, params }) => ({
    rowNumber,
    column,
    code,
    severity,
    params
  }));

describe('the file with errors, made from a real check', () => {
  // Row 2 is clean, row 3 has a parent that does not exist, row 4 is a blank
  // line, row 5 has two bad cells, row 6 has a quoted name, row 7 is clean.
  const FILE = categoryFile(
    named('a'),
    named('b', 'ghost'),
    '',
    named('c', '', { status: 'maybe', position: 'x' }),
    named('d', '', { name: '"Quoted, name"' }),
    named('e')
  );

  it('has a line for each row of the file, the problems on the rows that have them', async () => {
    const h = harness();
    h.stage(FILE);
    await runValidation(1, h.deps);
    const lines = (await download(h, 1, 'validate')).split('\r\n');
    expect(lines.pop()).toBe('');
    // The header, then rows 2 to 7 of the file.
    expect(lines).toHaveLength(7);
    expect(lines[0].endsWith(',_errors')).toBe(true);
    expect(lines[1].endsWith(',')).toBe(true); // a: clean
    expect(lines[2]).toContain('parent: ');
    expect(lines[3]).toBe(''); // the blank line
    expect(lines[4]).toContain('status: ');
    expect(lines[4]).toContain('position: ');
    expect(lines[4].indexOf('status: ')).toBeLessThan(
      lines[4].indexOf('position: ')
    );
    expect(lines[5]).toContain(',"Quoted, name",');
    expect(lines[5].endsWith(',')).toBe(true); // d: clean
    expect(lines[6].endsWith(',')).toBe(true); // e: clean
  });

  it('gives the same problems on the same rows when it is uploaded again as it is', async () => {
    const h = harness();
    h.stage(FILE);
    await runValidation(1, h.deps);
    const first = h.jobs.issues(1);
    expect(first.map((i) => i.column).sort()).toEqual([
      'parent',
      'position',
      'status'
    ]);

    h.stage(await download(h, 1, 'validate'), { id: 2 });
    await runValidation(2, h.deps);
    const second = h.jobs.issues(2);
    expect(shape(second)).toEqual(shape(first));
    // The column _errors is not an unknown column (ALL-19).
    expect(second.some((i) => i.code === 'UNKNOWN_COLUMN')).toBe(false);
    expect(h.jobs.snapshot(2).counts).toMatchObject({
      total: h.jobs.snapshot(1).counts.total,
      errors: h.jobs.snapshot(1).counts.errors
    });
  });

  it('and a file that was corrected from it is accepted', async () => {
    const h = harness();
    h.stage(categoryFile(named('a'), named('b', 'ghost')));
    await runValidation(1, h.deps);
    const text = await download(h, 1, 'validate');
    expect(text).toContain('parent: ');
    const corrected = text.replace('GHOST', '').replace(/ghost/g, 'a');
    h.stage(corrected, { id: 2 });
    await runValidation(2, h.deps);
    expect(h.jobs.snapshot(2).counts.errors).toBe(0);
  });

  it('is the same with a different language for the messages, and the file stays readable', async () => {
    const h = harness();
    h.stage(categoryFile(named('b', 'ghost')));
    await runValidation(1, h.deps);
    let text = '';
    for await (const chunk of fileWithErrors({
      entity: 'category',
      source: h.files.open(1),
      issues: h.jobs.issuesInRowOrder(1, 'validate'),
      render: (issue) => `[vi] ${issue.code}`
    })) {
      text += chunk;
    }
    expect(text).toContain('parent: [vi] REFERENCE_NOT_FOUND');
  });
});

describe('the file with errors, made from an import', () => {
  it('lists the rows that failed, and the rows below them that were skipped', async () => {
    const h = harness();
    h.stage(categoryFile(named('root'), named('kid', 'root'), named('ok')), {
      status: 'queued'
    });
    h.services.failOn(
      (call) => call.input.url_key === 'root',
      Object.assign(new Error('duplicate'), { code: '23505' })
    );
    expect((await runImport(1, h.deps)).outcome).toBe('completed');
    const lines = (await download(h, 1, 'import')).split('\r\n');
    expect(lines[1]).not.toMatch(/,$/); // root failed
    expect(lines[2]).not.toMatch(/,$/); // kid was skipped
    expect(lines[3]).toMatch(/,$/); // ok was written
  });
});

describe('the file with errors, when the problems were cut at the cap', () => {
  it('says so on every row from the first one that is not listed', async () => {
    const h = harness({ config: { maxIssues: 3 } });
    h.stage(
      categoryFile(
        ...Array.from({ length: 8 }, (_, n) =>
          named(`k${n}`, '', { status: 'x' })
        )
      )
    );
    await runValidation(1, h.deps);
    const lines = (await download(h, 1, 'validate')).split('\r\n');
    const marked = lines.map((line) =>
      line.includes('more problems not listed')
    );
    // Header, rows 2 to 4 are listed, rows 5 to 9 are not.
    expect(marked).toEqual([
      false,
      false,
      false,
      false,
      true,
      true,
      true,
      true,
      true,
      false // the empty text after the last CRLF
    ]);
    expect(lines[1]).toContain('status: ');
    expect(lines[4]).toBe(
      lines[4].replace(/status: .*/, '(more problems not listed)')
    );
  });
});

import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import {
  allowCategoryWrites,
  categoryKeys,
  FAIL_KEY_PREFIX,
  jobsByFile,
  refuseCategoryWrites,
  sweepImportWorld
} from '../../../shared/importDb.js';
import {
  startAndWaitForDone,
  uploadFile,
  viewText,
  waitForChecked,
  writeCsv
} from '../../../shared/importPage.js';

/**
 * Rows that fail at the write (spec § 11.4: "failure mid-run" and "stop after 10
 * failures"). The check cannot see these: the database refuses a category whose
 * key starts with `e2e-imp-fail-` (a trigger the spec installs and removes), as a
 * full disk or a conflict with another admin would.
 */
test.describe.configure({ mode: 'serial', timeout: 240_000 });

test.beforeAll(sweepImportWorld);
test.afterEach(sweepImportWorld);
test.afterAll(sweepImportWorld);

const HEADER = ['url_key', 'name', 'parent', 'status', 'position'];
const row = (key: string, n: number) => [key, `Name ${n}`, '', '1', String(n)];

test('a few rows fail at the write: the rest completes, the failures are listed, and the same file again completes the job', async ({ page }, info) => {
  await refuseCategoryWrites();
  const file = writeCsv(info.outputPath('files'), 'e2e-imp-mid-run.csv', [
    HEADER,
    row('e2e-imp-ok-1', 1),
    row('e2e-imp-ok-2', 2),
    row(`${FAIL_KEY_PREFIX}1`, 3),
    row('e2e-imp-ok-3', 4),
    row(`${FAIL_KEY_PREFIX}2`, 5),
    row('e2e-imp-ok-4', 6)
  ]);
  await uploadFile(page, 'Categories', file);
  await waitForChecked(page);
  // the check cannot see a refusal of the database
  expect(await viewText(page)).toMatch(/6 rows are valid/);

  await startAndWaitForDone(page);
  expect(await viewText(page)).toContain('Done. Created 4 - Updated 0 - Failed 2 - Skipped 0');
  // the rows that did not fail were written, the others were not
  expect(await categoryKeys()).toEqual([
    'e2e-imp-ok-1',
    'e2e-imp-ok-2',
    'e2e-imp-ok-3',
    'e2e-imp-ok-4'
  ]);

  // the problems of the import: the two rows, with the key that failed
  const table = page.getByTestId('problems');
  await expect(table.getByRole('row')).toHaveCount(1 + 2);
  await expect(table).toContainText(`${FAIL_KEY_PREFIX}1`);
  await expect(table).toContainText(`${FAIL_KEY_PREFIX}2`);
  await expect(table).not.toContainText('e2e-imp-ok-');

  // the file with errors has every row, and the reason on the two that failed
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download file with errors' }).click()
  ]).then(([d]) => d);
  const csv = readFileSync(await download.path(), 'utf8')
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter(Boolean);
  expect(csv).toHaveLength(1 + 6);
  expect(csv[0]).toBe([...HEADER, '_errors'].join(','));
  expect(csv[1]).toBe('e2e-imp-ok-1,Name 1,,1,1,');
  expect(csv[3]).toContain(`${FAIL_KEY_PREFIX}1`);
  expect(csv[3].endsWith(',')).toBe(false);
  expect(csv[5]).toContain(`${FAIL_KEY_PREFIX}2`);
  expect(csv[5].endsWith(',')).toBe(false);

  // The cause is gone: the same file again updates what was written and creates the rest.
  await allowCategoryWrites();
  await uploadFile(page, 'Categories', file);
  await waitForChecked(page);
  expect(await viewText(page)).toMatch(/6 rows are valid: 2 to create, 4 to update, 0 warnings\./);
  await startAndWaitForDone(page);
  expect(await viewText(page)).toContain('Done. Created 2 - Updated 4 - Failed 0 - Skipped 0');
  expect(await categoryKeys()).toHaveLength(6);
  const jobs = await jobsByFile('e2e-imp-mid-run.csv');
  expect(jobs.map((j) => j.status)).toEqual(['completed', 'completed']);
});

test('ten rows fail: the import stops, the rows before them stay, and Resume tries them again and completes it', async ({ page }, info) => {
  await refuseCategoryWrites();
  const rows: string[][] = [HEADER, row('e2e-imp-ok-1', 1), row('e2e-imp-ok-2', 2)];
  for (let i = 1; i <= 11; i += 1) rows.push(row(`${FAIL_KEY_PREFIX}${i}`, 2 + i));
  rows.push(row('e2e-imp-ok-3', 14), row('e2e-imp-ok-4', 15));
  const file = writeCsv(info.outputPath('files'), 'e2e-imp-stop-ten.csv', rows);
  await uploadFile(page, 'Categories', file);
  await waitForChecked(page);
  await page.getByRole('button', { name: 'Start import' }).click();

  // The tenth failure stops the import: 2 created and 10 failed are 12 of 15 rows.
  await expect(
    page.getByText('Stopped after 10 failed rows (12 of 15 rows done).')
  ).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole('button', { name: 'Resume' })).toBeEnabled();
  expect(await categoryKeys()).toEqual(['e2e-imp-ok-1', 'e2e-imp-ok-2']);
  const table = page.getByTestId('problems');
  await expect(table.getByRole('row')).toHaveCount(1 + 10);

  // The cause is removed: Resume tries the ten again and goes on with the three after them.
  await allowCategoryWrites();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByText(/^Done\./)).toBeVisible({ timeout: 120_000 });
  expect(await categoryKeys()).toHaveLength(15);
  expect(await viewText(page)).toContain('Created 15 - Updated 0 - Failed 0 - Skipped 0');
  const [job] = await jobsByFile('e2e-imp-stop-ten.csv');
  expect(job.status).toBe('completed');
});

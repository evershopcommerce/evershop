import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import {
  categoryRow,
  deleteCategory,
  insertCategory,
  jobsByFile,
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
 * A file with faults (spec § 11.4): the problems table shows each row, column and
 * code; it filters; the downloaded file has every row and the `_errors` column;
 * Start is not offered until the file is clean; Check again accepts the stored
 * file once the missing record exists; and a record that the file needs and that
 * is deleted after the check sends the job back to "checked" at Start, with the
 * new problem and nothing written (D-33).
 */
test.describe.configure({ mode: 'serial', timeout: 180_000 });

test.beforeAll(sweepImportWorld);
test.afterAll(async () => {
  await deleteCategory('e2e-imp-late-parent').catch(() => undefined);
  await sweepImportWorld();
});

const HEADER = ['url_key', 'name', 'parent', 'status', 'position'];

test('the problems are listed, filtered and downloaded; Start is not offered; Check again accepts the file once the parent exists', async ({ page }, info) => {
  const dir = info.outputPath('files');
  const file = writeCsv(dir, 'e2e-imp-faults.csv', [
    HEADER,
    ['e2e-imp-fine', 'Fine', '', '1', '1'],
    ['bad key!', 'Bad key', '', '1', '1'],
    ['e2e-imp-orphan', 'Orphan', 'e2e-imp-late-parent', '1', '1'],
    ['e2e-imp-badstatus', 'Bad status', '', 'maybe', '1']
  ]);
  const uuid = await uploadFile(page, 'Categories', file);
  await waitForChecked(page);

  // what the check says
  const text = await viewText(page);
  expect(text).toMatch(/The check found 3 errors and 0 warnings in 4 rows\./);
  expect(text).toContain('Fix them to continue: the import starts only on a clean file.');
  await expect(page.getByRole('button', { name: 'Start import' })).toHaveCount(0);

  // every problem has its row, its column and its type
  const table = page.getByTestId('problems');
  await expect(table.getByRole('row')).toHaveCount(1 + 3);
  await expect(table).toContainText('bad key!');
  await expect(table).toContainText('e2e-imp-late-parent');
  await expect(table).toContainText('maybe');
  await expect(table).toContainText('INVALID_VALUE x2');
  await expect(table).toContainText('REFERENCE_NOT_FOUND x1');

  // a filter by type
  await table.getByRole('button', { name: 'REFERENCE_NOT_FOUND x1' }).click();
  await expect(table.getByRole('row')).toHaveCount(1 + 1);
  await expect(table).toContainText('e2e-imp-late-parent');
  await expect(table).not.toContainText('bad key!');
  // the totals per type stay those of the whole job
  await expect(table).toContainText('INVALID_VALUE x2');
  await table.getByRole('button', { name: 'REFERENCE_NOT_FOUND x1' }).click();
  await expect(table.getByRole('row')).toHaveCount(1 + 3);

  // a filter by column
  await table.getByLabel('Column').fill('status');
  await table.getByLabel('Column').press('Enter');
  await expect(table.getByRole('row')).toHaveCount(1 + 1);
  await expect(table).toContainText('maybe');
  await table.getByLabel('Column').fill('');
  await table.getByLabel('Column').press('Enter');

  // the download has every row, and the reason on the rows that have one
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download file with errors' }).click()
  ]).then(([d]) => d);
  expect(download.suggestedFilename()).toBe('e2e-imp-faults-with-errors.csv');
  // The file starts with a byte order mark, so that a spreadsheet reads it as UTF-8.
  const csv = readFileSync(await download.path(), 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(Boolean);
  expect(csv).toHaveLength(1 + 4);
  expect(csv[0]).toBe([...HEADER, '_errors'].join(','));
  expect(csv[1]).toBe('e2e-imp-fine,Fine,,1,1,');
  expect(csv[2]).toContain('url_key:');
  expect(csv[3]).toContain('parent:');
  expect(csv[4]).toContain('status:');

  // nothing was written
  expect(await categoryRow('e2e-imp-fine')).toBeNull();
  expect(uuid).toBeTruthy();
});

test('Check again: the same stored file is accepted once the record that it needs exists', async ({ page }, info) => {
  const dir = info.outputPath('files');
  const file = writeCsv(dir, 'e2e-imp-late.csv', [
    HEADER,
    ['e2e-imp-orphan2', 'Orphan', 'e2e-imp-late-parent', '1', '1']
  ]);
  await uploadFile(page, 'Categories', file);
  await waitForChecked(page);
  await expect(page.getByText('The check found 1 errors')).toBeVisible();
  expect(await jobsByFile('e2e-imp-late.csv')).toHaveLength(1);

  // the record appears in the store, by another way
  const parentId = await insertCategory('e2e-imp-late-parent', 'Late parent');
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(page.getByText(/All 1 rows are valid/)).toBeVisible({ timeout: 90_000 });
  await startAndWaitForDone(page);
  expect((await categoryRow('e2e-imp-orphan2'))?.parent_id).toBe(parentId);
});

test('a record that the file needs is deleted after the check: Start finds it, writes nothing, and says so (D-33)', async ({ page }, info) => {
  const dir = info.outputPath('files');
  await insertCategory('e2e-imp-late-parent', 'Late parent').catch(() => undefined);
  const file = writeCsv(dir, 'e2e-imp-gone.csv', [
    HEADER,
    ['e2e-imp-child3', 'Child', 'e2e-imp-late-parent', '1', '1']
  ]);
  await uploadFile(page, 'Categories', file);
  await waitForChecked(page);
  await expect(page.getByText(/All 1 rows are valid/)).toBeVisible();

  await deleteCategory('e2e-imp-late-parent');
  await page.getByRole('button', { name: 'Start import' }).click();
  await expect(page.getByText('The file was checked again when the import was about to start, and new problems were found.')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole('button', { name: 'Start import' })).toHaveCount(0);
  await expect(page.getByTestId('problems')).toContainText('e2e-imp-late-parent');
  expect(await categoryRow('e2e-imp-child3')).toBeNull();
  const [job] = await jobsByFile('e2e-imp-gone.csv');
  expect(job.status).toBe('validated');
  expect(job.started_at).toBeNull();
});

test('a products file uploaded as Categories is refused for its type, not accepted with warnings', async ({ page }, info) => {
  const file = writeCsv(info.outputPath('files'), 'e2e-imp-wrong-type.csv', [
    ['sku', 'name', 'url_key', 'status', 'price', 'qty'],
    ['E2E-WRONG-1', 'Blue shirt', 'e2e-imp-wrong-1', '1', '19.99', '5']
  ]);
  await uploadFile(page, 'Categories', file);
  await waitForChecked(page);

  // not "All 1 rows are valid ... warnings": the file is refused, with the reason
  const text = await viewText(page);
  expect(text).not.toContain('rows are valid');
  await expect(page.getByRole('button', { name: 'Start import' })).toHaveCount(0);
  const table = page.getByTestId('problems');
  await expect(table).toContainText('WRONG_FILE_TYPE x1');
  await expect(table).toContainText(
    'This looks like a products file: it has a "sku" column.'
  );
  // the other columns of the file are not listed one by one
  await expect(table).not.toContainText('UNKNOWN_COLUMN');
});


import { test, expect } from '@playwright/test';
import {
  createOtherAdmin,
  deleteOtherAdmin,
  insertJob,
  jobsByFile,
  sweepImportWorld
} from '../../../shared/importDb.js';
import {
  dialogButton,
  openNewImport,
  REPLACE_QUESTION,
  uploadFile,
  waitForChecked,
  writeCsv
} from '../../../shared/importPage.js';
import type { TestAdmin } from '../../../shared/auth.js';

/**
 * One at a time (spec § 11.4, § 8.2, D-11, D-32): an upload while the same type
 * runs is refused with the message; a second file uploaded before Start replaces
 * the first (and asks first when the first is another admin's); Start of a second
 * type while one runs is refused; a different type may be uploaded and checked
 * during a run.
 */
test.describe.configure({ mode: 'serial', timeout: 180_000 });

let other: TestAdmin;
test.beforeAll(async () => {
  await sweepImportWorld();
  other = await createOtherAdmin();
});
test.afterAll(async () => {
  await sweepImportWorld();
  await deleteOtherAdmin(other);
});
test.afterEach(sweepImportWorld);

const HEADER = ['url_key', 'name', 'parent', 'status', 'position'];

test('a second file before Start replaces the first: the first is gone, and the notice says so', async ({ page }, info) => {
  const dir = info.outputPath('files');
  const first = writeCsv(dir, 'e2e-imp-first.csv', [HEADER, ['e2e-imp-one', 'One', '', '1', '1']]);
  const second = writeCsv(dir, 'e2e-imp-second.csv', [HEADER, ['e2e-imp-two', 'Two', '', '1', '1']]);
  await uploadFile(page, 'Categories', first);
  await waitForChecked(page);

  await openNewImport(page, 'Categories');
  await expect(page.getByText(/There is an unfinished categories import \(e2e-imp-first\.csv, checked, uploaded by .+\)\. A new upload replaces it\./)).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(second);
  await page.getByRole('button', { name: 'Upload and validate' }).click();
  // my own job: no question
  await expect(page.getByText(REPLACE_QUESTION)).toHaveCount(0);
  await page.waitForURL(/\/admin\/import\/view\//);
  await waitForChecked(page);
  expect(await jobsByFile('e2e-imp-first.csv')).toHaveLength(0);
  expect(await jobsByFile('e2e-imp-second.csv')).toHaveLength(1);
});

test('another admin’s unfinished job: the page asks first; no leaves it, yes replaces it', async ({ page }, info) => {
  const theirs = await insertJob({
    entity: 'category',
    status: 'validated',
    fileName: 'e2e-imp-theirs.csv',
    createdBy: other.adminUserId,
    counts: { createRows: 1 }
  });
  const file = writeCsv(info.outputPath('files'), 'e2e-imp-mine.csv', [HEADER, ['e2e-imp-mine', 'Mine', '', '1', '1']]);
  await openNewImport(page, 'Categories');
  await expect(page.getByText(/uploaded by E2E Other Admin/)).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(file);
  await page.getByRole('button', { name: 'Upload and validate' }).click();

  await expect(page.getByText('Replace the earlier upload?')).toBeVisible();
  await expect(page.getByText(/^E2E Other Admin uploaded e2e-imp-theirs\.csv at .+ Uploading replaces it\. Continue\?$/)).toBeVisible();
  await dialogButton(page, 'Cancel').click();
  // nothing was sent, and the other admin's job is where it was
  expect(await jobsByFile('e2e-imp-mine.csv')).toHaveLength(0);
  expect(await jobsByFile(theirs.fileName)).toHaveLength(1);

  await page.getByRole('button', { name: 'Upload and validate' }).click();
  await dialogButton(page, 'Upload').click();
  await page.waitForURL(/\/admin\/import\/view\//);
  expect(await jobsByFile('e2e-imp-mine.csv')).toHaveLength(1);
  expect(await jobsByFile(theirs.fileName)).toHaveLength(0);
});

test('a stopped import that wrote rows: the page asks first and says how many rows stay', async ({ page }, info) => {
  await insertJob({
    entity: 'category',
    status: 'stopped',
    fileName: 'e2e-imp-stopped.csv',
    createdBy: other.adminUserId,
    wrote: true,
    counts: { total: 100, created: 9990, failed: 10 }
  });
  const file = writeCsv(info.outputPath('files'), 'e2e-imp-after-stop.csv', [HEADER, ['e2e-imp-x', 'X', '', '1', '1']]);
  await openNewImport(page, 'Categories');
  await expect(page.getByText('A categories import was stopped after 10000 rows. Uploading closes it; the rows already written stay.')).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(file);
  await page.getByRole('button', { name: 'Upload and validate' }).click();
  await expect(page.getByText('Close the earlier import?')).toBeVisible();
  await dialogButton(page, 'Upload').click();
  await page.waitForURL(/\/admin\/import\/view\//);
  // closed as canceled, its history stays; the new job is open
  expect((await jobsByFile('e2e-imp-stopped.csv'))[0]?.status ?? 'deleted').toMatch(/canceled|deleted/);
  expect(await jobsByFile('e2e-imp-after-stop.csv')).toHaveLength(1);
});

test('an import of the type is at work: the upload is held, with the message; another type is free', async ({ page }, info) => {
  await insertJob({
    entity: 'category',
    status: 'running',
    fileName: 'e2e-imp-running.csv',
    createdBy: other.adminUserId,
    wrote: true,
    counts: { total: 100, created: 36 }
  });
  const dir = info.outputPath('files');
  const categories = writeCsv(dir, 'e2e-imp-blocked.csv', [HEADER, ['e2e-imp-b', 'B', '', '1', '1']]);
  await openNewImport(page, 'Categories');
  await page.locator('input[type="file"]').setInputFiles(categories);
  await expect(page.getByText('A categories import is running (36%). You can upload a new file when it finishes, or cancel it.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload and validate' })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Open it' })).toBeVisible();

  // the server refuses too, whatever the page does
  const refused = await page.request.post('/api/import-jobs', {
    headers: { 'X-Import-Request': '1' },
    multipart: { entity: 'category', mode: 'upsert', checkImages: 'false', file: { name: 'e2e-imp-direct.csv', mimeType: 'text/csv', buffer: Buffer.from('url_key,name\r\ne2e-imp-d,D\r\n') } }
  });
  expect(refused.status()).toBe(409);
  expect((await refused.json()).error.code).toBe('IMPORT_RUNNING');

  // another type may be uploaded and checked during a run
  const customers = writeCsv(dir, 'e2e-imp-customers-during.csv', [
    ['email', 'full_name', 'status', 'group', 'password_hash', 'password'],
    ['during@e2e-import.invalid', 'During', '1', '', '', '']
  ]);
  await uploadFile(page, 'Customers', customers);
  await waitForChecked(page);
  await expect(page.getByText(/All 1 rows are valid/)).toBeVisible();

  // ... but not started while the other runs: the button is held, with the reason, and the server refuses too
  await expect(page.getByRole('button', { name: 'Start import' })).toBeDisabled();
  await expect(page.getByText('A categories import is running. Start this one when it finishes.')).toBeVisible();
  const uuid = /view\/([0-9a-f-]{36})/.exec(page.url())![1];
  const start = await page.request.post(`/api/import-jobs/${uuid}/start`, { headers: { 'X-Import-Request': '1' } });
  expect(start.status()).toBe(409);
  expect((await start.json()).error.code).toBe('IMPORT_ALREADY_RUNNING');
});

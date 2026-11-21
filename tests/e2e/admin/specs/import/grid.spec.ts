import { test, expect } from '@playwright/test';
import {
  insertJob,
  jobsByFile,
  sweepImportWorld
} from '../../../shared/importDb.js';
import { dialogButton, pickChoice } from '../../../shared/importPage.js';

/**
 * The list of past imports (spec § 8.1): the rows, the filters, the order, the
 * link to the page of an import, and Delete (not for an import that is at work).
 */
test.describe.configure({ mode: 'serial', timeout: 120_000 });

test.beforeEach(sweepImportWorld);
test.afterAll(sweepImportWorld);

const rowOf = (page: import('@playwright/test').Page, file: string) =>
  page.getByRole('row').filter({ hasText: file });

test('the menu opens the list; a row has the file, the type, the status and the numbers; the file opens its page', async ({ page }) => {
  const done = await insertJob({
    entity: 'product',
    status: 'completed',
    fileName: 'e2e-imp-grid-done.csv',
    wrote: true,
    counts: { total: 50000, created: 48900, updated: 1000, failed: 3 }
  });
  await page.goto('/admin');
  await page.getByRole('link', { name: 'Import' }).first().click();
  await expect(page).toHaveURL(/\/admin\/import$/);
  await expect(page.getByRole('heading', { name: 'Import' })).toBeVisible();

  const row = rowOf(page, done.fileName);
  await expect(row).toContainText('Products');
  await expect(row).toContainText('Create and update');
  await expect(row).toContainText('Completed');
  await expect(row).toContainText('50,000');
  await expect(row).toContainText('48,900');
  await expect(row).toContainText('1,000');

  await row.getByRole('link', { name: done.fileName }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/import/view/${done.uuid}$`));
  await expect(page.getByText('Done. Created 48,900 - Updated 1,000 - Failed 3 - Skipped 0')).toBeVisible();
});

test('"New import" goes to the upload page', async ({ page }) => {
  await page.goto('/admin/import');
  await page.getByRole('link', { name: 'New import' }).click();
  await expect(page).toHaveURL(/\/admin\/import\/new$/);
});

test('an upload that has not arrived is not in the list', async ({ page }) => {
  await insertJob({ entity: 'category', status: 'uploading', fileName: 'e2e-imp-grid-arriving.csv' });
  await insertJob({ entity: 'customer', status: 'completed', fileName: 'e2e-imp-grid-there.csv' });
  await page.goto('/admin/import?limit=50');
  await expect(rowOf(page, 'e2e-imp-grid-there.csv')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'e2e-imp-grid-arriving.csv' })).toHaveCount(0);
});

test('filters: by status, by type and by part of the file name; Clear filter', async ({ page }) => {
  await insertJob({ entity: 'category', status: 'completed', fileName: 'e2e-imp-grid-a-spring.csv' });
  await insertJob({ entity: 'customer', status: 'stopped', fileName: 'e2e-imp-grid-b-winter.csv', wrote: true });
  await insertJob({ entity: 'product', status: 'failed', fileName: 'e2e-imp-grid-c-spring.csv' });
  await page.goto('/admin/import?limit=50');
  const rows = (re: RegExp) => page.getByRole('row').filter({ hasText: re });
  await expect(rows(/e2e-imp-grid-/)).toHaveCount(3);

  await pickChoice(page, page.getByLabel('Status'), 'Stopped');
  await expect(page).toHaveURL(/status=stopped/);
  await expect(rows(/e2e-imp-grid-/)).toHaveCount(1);
  await expect(rowOf(page, 'e2e-imp-grid-b-winter.csv')).toBeVisible();

  await page.getByRole('button', { name: 'Clear filter' }).click();
  await expect(page).toHaveURL(/\/admin\/import$/);
  await pickChoice(page, page.getByLabel('Type'), 'Products');
  await expect(rows(/e2e-imp-grid-/)).toHaveCount(1);
  await expect(rowOf(page, 'e2e-imp-grid-c-spring.csv')).toBeVisible();

  await page.getByRole('button', { name: 'Clear filter' }).click();
  await page.getByLabel('Search').fill('spring');
  await page.getByLabel('Search').press('Enter');
  await expect(page).toHaveURL(/file%5Bvalue%5D=spring|file\[value\]=spring/);
  await expect(rows(/e2e-imp-grid-/)).toHaveCount(2);
  await expect(page.getByLabel('Search')).toHaveValue('spring');
  // a word of the search that is also a pattern character is only a character
  await page.goto('/admin/import?file[operation]=like&file[value]=%25');
  await expect(rows(/e2e-imp-grid-/)).toHaveCount(0);
});

test('Delete: asks first, deletes the chosen imports, and an import that is at work cannot be chosen', async ({ page }) => {
  const gone = await insertJob({ entity: 'customer', status: 'completed', fileName: 'e2e-imp-grid-delete-me.csv' });
  const kept = await insertJob({ entity: 'category', status: 'completed', fileName: 'e2e-imp-grid-keep-me.csv' });
  const busy = await insertJob({ entity: 'product', status: 'running', fileName: 'e2e-imp-grid-busy.csv', wrote: true });
  await page.goto('/admin/import?limit=50');
  await expect(rowOf(page, busy.fileName).getByRole('checkbox')).toBeDisabled();

  await rowOf(page, gone.fileName).getByRole('checkbox').check();
  const request = page.waitForRequest((r) => r.method() === 'DELETE');
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Delete the selected imports?')).toBeVisible();
  // No: nothing is deleted.
  await dialogButton(page, 'Cancel').click();
  expect(await jobsByFile(gone.fileName)).toHaveLength(1);

  await page.getByRole('button', { name: 'Delete' }).click();
  await dialogButton(page, 'Delete').click();
  expect((await request).headers()['x-import-request']).toBe('1');
  await expect(rowOf(page, gone.fileName)).toHaveCount(0, { timeout: 30_000 });
  expect(await jobsByFile(gone.fileName)).toHaveLength(0);
  expect(await jobsByFile(kept.fileName)).toHaveLength(1);
  expect(await jobsByFile(busy.fileName)).toHaveLength(1);
});

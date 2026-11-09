import { test, expect } from '@playwright/test';
import { categoryRow, sweepImportWorld } from '../../../shared/importDb.js';
import {
  openNewImport,
  startAndWaitForDone,
  VIEW_URL,
  viewText,
  waitForChecked,
  type EntityChoice
} from '../../../shared/importPage.js';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The template (spec § 11.4, D-13): the file that the page offers has the header
 * and the example rows; uploading it as it is imports nothing and shows the
 * warnings.
 */
test.describe.configure({ mode: 'serial', timeout: 180_000 });

test.beforeAll(sweepImportWorld);
test.afterEach(sweepImportWorld);
test.afterAll(sweepImportWorld);

const TYPES: Array<[EntityChoice, string, string]> = [
  ['Products', 'products', 'sku,name,url_key'],
  ['Categories', 'categories', 'url_key,name,parent'],
  ['Customers', 'customers', 'email,full_name,status'],
  ['Customer addresses', 'customer-addresses', 'email,recipient,organization']
];

for (const [label, route, headerStart] of TYPES) {
  test(`${label}: the link downloads a template with the header and two example rows`, async ({ page }) => {
    await openNewImport(page, label);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: /template \(CSV\)/ }).click()
    ]);
    expect(download.suggestedFilename()).toBe(`${route}.csv`);
    const text = readFileSync(await download.path(), 'utf8');
    // a byte order mark, so that a spreadsheet reads UTF-8
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const lines = text.slice(1).split(/\r?\n/).filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines[0].startsWith(headerStart)).toBe(true);
  });
}

test('Categories: uploading the template as it is imports nothing and shows the warnings', async ({ page }, info) => {
  await openNewImport(page, 'Categories');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: /template \(CSV\)/ }).click()
  ]);
  const dir = info.outputPath('files');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'e2e-imp-template.csv');
  writeFileSync(file, readFileSync(await download.path()));

  await page.locator('input[type="file"]').setInputFiles(file);
  await page.getByRole('button', { name: 'Upload and validate' }).click();
  await page.waitForURL(VIEW_URL);
  await waitForChecked(page);
  // the example rows are warnings: they can be imported, and they are named
  expect(await viewText(page)).toMatch(/warnings/);
  await expect(page.getByTestId('problems')).toContainText('TEMPLATE_EXAMPLE_ROW');
  await startAndWaitForDone(page);
  await expect(page.getByText(/Created 0 - Updated 0 - Failed 0 - Skipped \d+/)).toBeVisible();
  expect(await categoryRow('example-category')).toBeNull();
  expect(await categoryRow('example-subcategory')).toBeNull();
});

import { test, expect } from '@playwright/test';
import { getDb } from '../../../shared/db.js';
import { countCategories, jobsByFile, sweepImportWorld } from '../../../shared/importDb.js';
import { dialogButton, uploadFile, waitForChecked, writeCsv } from '../../../shared/importPage.js';

/**
 * A run that takes time (spec § 11.4): the bar and the numbers follow it while the
 * page is open, Cancel stops it between two rows, and what was written stays.
 */
test.describe.configure({ timeout: 300_000 });

test.beforeAll(sweepImportWorld);
test.afterAll(sweepImportWorld);

const ROWS = 1500;

test('the page follows a run, Cancel stops it between two rows, and the rows that were written stay', async ({ page }, info) => {
  const rows = [['url_key', 'name', 'parent', 'status', 'position']];
  for (let i = 1; i <= ROWS; i += 1) rows.push([`e2e-imp-bulk-${i}`, `Bulk ${i}`, '', '1', String(i)]);
  const file = writeCsv(info.outputPath('files'), 'e2e-imp-bulk.csv', rows);

  await uploadFile(page, 'Categories', file);
  await waitForChecked(page);
  await expect(page.getByText(`All ${ROWS.toLocaleString('en-US')} rows are valid`)).toBeVisible();

  await page.getByRole('button', { name: 'Start import' }).click();
  // the numbers move while the page is open: at some moment some rows are done and some are not
  const progress = page.getByText(/^Importing\.\.\. [\d,]+ of 1,500 rows/);
  await expect(progress).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole('progressbar')).toBeVisible();
  await expect.poll(async () => {
    const t = (await progress.textContent().catch(() => '')) ?? '';
    return Number((/Importing\.\.\. ([\d,]+) of/.exec(t)?.[1] ?? '0').replace(/,/g, ''));
  }, { timeout: 120_000 }).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Cancel' }).click();
  await dialogButton(page, 'Cancel the import').click();
  await expect(page.getByText(/^Canceled after [\d,]+ rows\./)).toBeVisible({ timeout: 60_000 });

  const [job] = await jobsByFile('e2e-imp-bulk.csv');
  expect(job.status).toBe('canceled');
  const written = await countCategories('e2e-imp-bulk-%');
  expect(written).toBeGreaterThan(0);
  expect(written).toBeLessThan(ROWS);
  // what the job says is what the store has: the rows stay
  expect(job.counts.created).toBeGreaterThanOrEqual(written - 1);
  const { rows: left } = await getDb().query(`SELECT count(*)::int AS n FROM category_description WHERE url_key LIKE 'e2e-imp-bulk-%'`);
  expect(left[0].n).toBe(written);
});

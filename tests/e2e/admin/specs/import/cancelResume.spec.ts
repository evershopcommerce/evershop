import { test, expect } from '@playwright/test';
import { getDb } from '../../../shared/db.js';
import {
  categoryRow,
  insertJob,
  jobsByFile,
  sweepImportWorld
} from '../../../shared/importDb.js';
import {
  dialogButton,
  uploadFile,
  viewText,
  waitForChecked,
  writeCsv
} from '../../../shared/importPage.js';

/**
 * Cancel, resume and the states that end an import (spec § 11.4): Cancel asks
 * first and stops between two rows; a stopped job resumes from its saved place and
 * completes; a job that failed offers no Resume.
 */
test.describe.configure({ mode: 'serial', timeout: 180_000 });

test.beforeAll(sweepImportWorld);
test.afterEach(sweepImportWorld);
test.afterAll(sweepImportWorld);

const HEADER = ['url_key', 'name', 'parent', 'status', 'position'];

test('a stopped job resumes at its saved place: the rows after it are done and the import completes', async ({ page }, info) => {
  const file = writeCsv(info.outputPath('files'), 'e2e-imp-resume.csv', [
    HEADER,
    ['e2e-imp-r1', 'R1', '', '1', '1'],
    ['e2e-imp-r2', 'R2', '', '1', '2'],
    ['e2e-imp-r3', 'R3', '', '1', '3']
  ]);
  const uuid = await uploadFile(page, 'Categories', file);
  await waitForChecked(page);

  // The import wrote the first row and then stopped (ten rows failed, say): its place is saved.
  await getDb().query(
    `UPDATE import_job
        SET status = 'stopped', started_at = now(), stage = NULL,
            error_message = 'Stopped after 10 failed rows.',
            counts = counts || '{"lastUnit":1,"created":1,"failed":0}'::jsonb
      WHERE uuid = $1`,
    [uuid]
  );
  await page.reload();
  await expect(page.getByText(/^Stopped after 0 failed rows \(1 of 3 rows done\)\./)).toBeVisible();
  await expect(page.getByText('Stopped after 10 failed rows.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeEnabled();

  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByText(/^Done\./)).toBeVisible({ timeout: 120_000 });
  // the rows after the saved place were written, the first was not touched again
  expect(await categoryRow('e2e-imp-r1')).toBeNull();
  expect(await categoryRow('e2e-imp-r2')).not.toBeNull();
  expect(await categoryRow('e2e-imp-r3')).not.toBeNull();
  const [job] = await jobsByFile('e2e-imp-resume.csv');
  expect(job.status).toBe('completed');
});

test('Cancel asks first, sends the request with the header, and says the import stops after the row', async ({ page }) => {
  const job = await insertJob({
    entity: 'category',
    status: 'validating',
    fileName: 'e2e-imp-cancel.csv'
  });
  await page.goto(`/admin/import/view/${job.uuid}`);
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Cancel this import?')).toBeVisible();

  // No: nothing is sent.
  await dialogButton(page, 'Keep it').click();
  expect((await jobsByFile(job.fileName))[0].status).toBe('validating');
  const control = async () =>
    (await getDb().query(`SELECT control FROM import_job WHERE uuid = $1`, [job.uuid])).rows[0].control;
  expect(await control()).toBeNull();

  // Yes: the job is asked to stop; the page says so and takes the button away.
  const request = page.waitForRequest((r) => r.url().endsWith(`/cancel`) && r.method() === 'POST');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await dialogButton(page, 'Cancel the import').click();
  expect((await request).headers()['x-import-request']).toBe('1');
  await expect(page.getByText('Canceling: the import stops after the row it is working on.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
  expect(await control()).toBe('cancel');
});

test('a job that could not run: the reason, a new upload and Delete, and no Resume', async ({ page }) => {
  const job = await insertJob({ entity: 'category', status: 'failed', fileName: 'e2e-imp-failed.csv' });
  await getDb().query(`UPDATE import_job SET error_message = 'The file could not be read.' WHERE uuid = $1`, [job.uuid]);
  await page.goto(`/admin/import/view/${job.uuid}`);
  await expect(page.getByText('The job could not run.')).toBeVisible();
  await expect(page.getByText('The file could not be read.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Upload a new file' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0);
});

test('an interrupted job: Resume and Delete, how many rows were done, and why', async ({ page }) => {
  const job = await insertJob({
    entity: 'category',
    status: 'interrupted',
    fileName: 'e2e-imp-interrupted.csv',
    wrote: true,
    counts: { total: 50000, created: 31200 }
  });
  await getDb().query(`UPDATE import_job SET error_message = 'The worker was stopped before it finished.' WHERE uuid = $1`, [job.uuid]);
  await page.goto(`/admin/import/view/${job.uuid}`);
  await expect(page.getByText('The import stopped before it finished. 31,200 rows were done.')).toBeVisible();
  await expect(page.getByText('The worker was stopped before it finished.')).toBeVisible();
  expect(await viewText(page)).toContain('Resume continues at the last saved row.');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
});

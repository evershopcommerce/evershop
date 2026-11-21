import { test, expect, request } from '@playwright/test';
import { insertJob, sweepImportWorld } from '../../../shared/importDb.js';

/**
 * Access (spec § 11.4, § 8.3, § 10): logged out there is no page and no API, and
 * a logged-in admin cannot change an import without the header that a form on
 * another site cannot send.
 */
test.beforeAll(sweepImportWorld);
test.afterEach(sweepImportWorld);
test.afterAll(sweepImportWorld);

const PAGES = ['/admin/import', '/admin/import/new'];

test.describe('logged out', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const path of PAGES) {
    test(`${path} sends the visitor to the login page`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  }

  test('the page of a job is not shown either', async ({ page }) => {
    await page.goto('/admin/import/view/6f1d9a52-0000-4000-8000-000000000001');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('the API answers 401, whatever the request is', async ({ baseURL }) => {
    const api = await request.newContext({ baseURL });
    const id = '6f1d9a52-0000-4000-8000-000000000001';
    const calls: Array<[string, string]> = [
      ['GET', '/api/import-open-jobs'],
      ['GET', `/api/import-jobs/${id}`],
      ['GET', `/api/import-jobs/${id}/issues`],
      ['GET', `/api/import-jobs/${id}/file-with-errors.csv`],
      ['GET', '/api/import-templates/products'],
      ['POST', '/api/import-jobs'],
      ['POST', `/api/import-jobs/${id}/start`],
      ['POST', `/api/import-jobs/${id}/cancel`],
      ['DELETE', `/api/import-jobs/${id}`]
    ];
    for (const [method, path] of calls) {
      const response = await api.fetch(path, { method, headers: { 'X-Import-Request': '1' } });
      expect(response.status(), `${method} ${path}`).toBe(401);
    }
    await api.dispose();
  });
});

test.describe('logged in', () => {
  test('a request that changes an import needs the header that a form on another site cannot send', async ({ page }) => {
    const job = await insertJob({ entity: 'category', status: 'validated', fileName: 'e2e-imp-guard.csv' });
    const without = await page.request.post(`/api/import-jobs/${job.uuid}/start`);
    expect(without.status()).toBe(400);
    expect((await without.json()).error.code).toBe('INVALID_REQUEST');
    const del = await page.request.delete(`/api/import-jobs/${job.uuid}`);
    expect(del.status()).toBe(400);
    // the reads need none
    const read = await page.request.get(`/api/import-jobs/${job.uuid}`);
    expect(read.status()).toBe(200);
    expect((await read.json()).data.fileName).toBe('e2e-imp-guard.csv');
  });

  test('the job of the API has no id of the database, no hash and no worker', async ({ page }) => {
    const job = await insertJob({ entity: 'category', status: 'validated', fileName: 'e2e-imp-shape.csv' });
    const body = (await (await page.request.get(`/api/import-jobs/${job.uuid}`)).json()).data;
    // Each one by itself: leaking any of them is a leak.
    for (const key of ['import_job_id', 'importJobId', 'fileSha256', 'file_sha256', 'worker', 'attempt']) {
      expect(Object.keys(body), key).not.toContain(key);
    }
    expect(body.uuid).toBe(job.uuid);
  });
});

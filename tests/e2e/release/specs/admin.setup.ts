// R-ADM-01 runs first (setup project): it signs in through the real admin
// login form and saves the session for every spec that needs the admin.
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '../support/test';
import { adminStateFile } from '../support/store';

test('R-ADM-01 The admin signs in with the account made by evershop install', async ({
  page,
  store,
  browser
}) => {
  // A re-run against the same store (--specs-only) reuses the saved session
  // instead of spending one of the store's 8 logins per 15 minutes. A full
  // run starts from an empty folder, so it always signs in for real.
  if (fs.existsSync(adminStateFile())) {
    const ctx = await browser.newContext({
      storageState: adminStateFile(),
      baseURL: store.baseUrl
    });
    const probe = await ctx.newPage();
    await probe.goto('/admin');
    const stillSignedIn = !probe.url().includes('/admin/login');
    await ctx.close();
    if (stillSignedIn) {
      test.info().annotations.push({
        type: 'note',
        description: 'reused the saved admin session (re-run)'
      });
      return;
    }
  }
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(store.admin.email);
  await page.getByLabel('Password').fill(store.admin.password);
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/admin/user/login') && r.request().method() === 'POST'
    ),
    page.getByRole('button', { name: /sign in/i }).click()
  ]);
  expect(response.ok(), `login answered ${response.status()}`).toBeTruthy();
  await page.waitForURL((u) => !u.pathname.startsWith('/admin/login'));
  await expect(page).toHaveURL(/\/admin\/?$/);
  fs.mkdirSync(path.dirname(adminStateFile()), { recursive: true });
  await page.context().storageState({ path: adminStateFile() });
});

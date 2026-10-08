import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';

/**
 * UI smoke for the "Replace homepage with this page" dialog (spec §10, §14):
 * the button renders in the page heading, the dialog runs preflight and lands
 * in the allowed or blocked state, and Cancel closes it without side effects.
 * The execute path is covered at API level by replace-homepage.spec.ts.
 */

const NAV_TIMEOUT = 90_000;

test.describe('admin / landing page / replace homepage dialog', () => {
  let uuid: string;

  test.beforeAll(async ({ request }) => {
    const key = `e2e-rhd-${randomUUID().slice(0, 8)}`;
    const created = await request.post('/api/landing-pages', {
      data: { name: `e2e-rhd ${key}`, url_key: key, status: 1 }
    });
    expect(created.status()).toBe(200);
    uuid = (await created.json()).data.uuid as string;
  });

  test.afterAll(async ({ request }) => {
    if (uuid) await request.delete(`/api/landing-pages/${uuid}`);
  });

  test('button opens the dialog, preflight resolves, Cancel closes it', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(`/admin/landing-page/edit/${uuid}`, { timeout: NAV_TIMEOUT });
    const open = page.getByRole('button', { name: 'Replace homepage with this page' });
    await expect(open).toBeVisible({ timeout: NAV_TIMEOUT });
    await open.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Replace homepage with this page')).toBeVisible();

    // Preflight finishes in either the allowed state (confirm enabled) or the
    // blocked state (a rollout plan from the developer's DB); both are valid.
    const confirm = dialog.getByRole('button', { name: 'Replace homepage', exact: true });
    await expect(dialog.getByText('Checking the homepage…')).toHaveCount(0, { timeout: 30_000 });
    const blocked = await dialog
      .getByText('These rollout plans change the homepage.')
      .count();
    if (blocked > 0) {
      await expect(confirm).toBeDisabled();
    } else {
      await expect(confirm).toBeEnabled();
      // A page with no widgets warns that the homepage would be empty.
      await expect(
        dialog.getByText('This landing page has no visible widgets in the current theme.')
      ).toBeVisible();
    }

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
  });
});

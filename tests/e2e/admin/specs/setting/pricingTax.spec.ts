import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  expect,
  test,
  type APIRequestContext,
  type PlaywrightWorkerArgs
} from '@playwright/test';
import { getSettingValue, snapshotSettings } from '../../../shared/settingDb.js';

/**
 * Pricing & Tax settings page (`/admin/setting/tax`) end-to-end. Drives the standalone
 * "Price rounding" card (its own form `#pricingRoundingConfig`, so it never touches the real
 * tax-class settings on the same page) and asserts the value reached the `setting` table.
 * The tax-calculation card shares the same save mechanism; its coercion is covered by
 * `modules/tax/tests/unit/taxSettings.test.js`.
 *
 * Live shared DB → serial, snapshot in beforeAll, restore through the API in afterAll.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const AUTH_STATE = path.join(__dirname, '..', '..', '..', '.auth', 'admin.json');

const KEYS = ['pricingRounding', 'pricingPrecision'];
const DEFAULTS: Record<string, string> = {
  pricingRounding: 'round',
  pricingPrecision: '2'
};

const apiContext = (
  playwright: PlaywrightWorkerArgs['playwright']
): Promise<APIRequestContext> =>
  playwright.request.newContext({ baseURL: BASE_URL, storageState: AUTH_STATE });

test.describe('admin / pricing & tax settings', () => {
  test.describe.configure({ mode: 'serial' });

  let prior: Record<string, string | null> = {};

  test.beforeAll(async () => {
    prior = await snapshotSettings(KEYS);
  });

  test.afterAll(async ({ playwright }) => {
    const api = await apiContext(playwright);
    const restore: Record<string, string> = {};
    for (const key of KEYS) {
      restore[key] = prior[key] ?? DEFAULTS[key];
    }
    await api.post('/api/settings', { data: restore });
    await api.dispose();
  });

  test('the price-rounding form persists to the setting table', async ({
    page
  }) => {
    await page.goto('/admin/setting/tax');

    const precision = page.locator('[name="pricingPrecision"]');
    await expect(precision).toBeVisible();
    await precision.fill('3');

    await page.locator('#pricingRoundingConfig button[type="submit"]').click();
    await expect(
      page.getByText('Pricing settings have been saved successfully!')
    ).toBeVisible();

    expect(await getSettingValue('pricingPrecision')).toBe('3');
  });
});

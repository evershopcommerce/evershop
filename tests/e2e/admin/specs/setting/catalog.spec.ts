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
 * Catalog settings page (`/admin/setting/catalog`) end-to-end: fill the form, save, and assert
 * the values reached the `setting` table. Proves the page → `POST /api/settings` → DB → cache
 * round trip. The string→typed coercion of these values is covered by the getter unit tests
 * (`modules/catalog/tests/unit/catalogSettings.test.js`).
 *
 * Runs against the live dev DB (shared, global singleton settings), so: serial mode, snapshot
 * the affected keys in beforeAll, restore via the API in afterAll (a raw DB restore would leave
 * the server's settings cache stale).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const AUTH_STATE = path.join(__dirname, '..', '..', '..', '.auth', 'admin.json');

const KEYS = [
  'catalogShowOutOfStockProduct',
  'catalogCollectionPageSize',
  'catalogProductImageWidth',
  'catalogProductImageHeight'
];
// Behaviour defaults, used to restore any key that had no prior row.
const DEFAULTS: Record<string, string> = {
  catalogShowOutOfStockProduct: 'false',
  catalogCollectionPageSize: '20',
  catalogProductImageWidth: '1200',
  catalogProductImageHeight: '1200'
};

const apiContext = (
  playwright: PlaywrightWorkerArgs['playwright']
): Promise<APIRequestContext> =>
  playwright.request.newContext({ baseURL: BASE_URL, storageState: AUTH_STATE });

test.describe('admin / catalog settings', () => {
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

  test('saving the form persists the values to the setting table', async ({
    page
  }) => {
    await page.goto('/admin/setting/catalog');

    const pageSize = page.locator('[name="catalogCollectionPageSize"]');
    await expect(pageSize).toBeVisible();
    await pageSize.fill('36');
    await page.locator('[name="catalogProductImageWidth"]').fill('900');

    await page.locator('#catalogSetting button[type="submit"]').click();
    await expect(
      page.getByText('Catalog settings have been saved successfully!')
    ).toBeVisible();

    expect(await getSettingValue('catalogCollectionPageSize')).toBe('36');
    expect(await getSettingValue('catalogProductImageWidth')).toBe('900');
  });
});

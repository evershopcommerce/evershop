import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  expect,
  test,
  type APIRequestContext,
  type PlaywrightWorkerArgs
} from '@playwright/test';
import { getDb } from '../../../shared/db.js';
import { getSettingValue, snapshotSettings } from '../../../shared/settingDb.js';

/**
 * Recommendation settings on Settings → Catalog (spec 05 § 10.1) — merged
 * into CatalogSetting's SINGLE form (owner design call 2026-07-16): one Save
 * button submits the classic catalog settings, the related-products rules
 * object, and the FBT gates together.
 *
 * Same live-singleton discipline as setting/catalog.spec.ts: serial,
 * snapshot the touched keys, restore through the API so the server's
 * settings cache is refreshed (a raw DB restore would leave it stale).
 *
 * The recompute spec runs LAST: it rebuilds product_stat/product_relation
 * from the store's real order history, wiping any seeded stats — derived
 * data, safe, but destructive to fixtures.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const AUTH_STATE = path.join(__dirname, '..', '..', '..', '.auth', 'admin.json');

const KEYS = [
  'crossSellMinPairCount',
  'crossSellMinAnchorOrders',
  'crossSellMinLift',
  'crossSellFallbackEnabled',
  'relatedProductsRules'
];
// Behaviour defaults (recommendationSettings.ts getters), used to restore
// any key that had no prior row.
const DEFAULTS: Record<string, unknown> = {
  crossSellMinPairCount: '3',
  crossSellMinAnchorOrders: '5',
  crossSellMinLift: '1',
  crossSellFallbackEnabled: true,
  relatedProductsRules: {
    enabled: true,
    rules: [{ type: 'same_category', enabled: true }],
    priceBand: { enabled: false, percent: 30 },
    fallbackToBestsellers: true
  }
};

const apiContext = (
  playwright: PlaywrightWorkerArgs['playwright']
): Promise<APIRequestContext> =>
  playwright.request.newContext({ baseURL: BASE_URL, storageState: AUTH_STATE });

test.describe('admin / recommendation settings', () => {
  test.describe.configure({ mode: 'serial' });

  let prior: Record<string, string | null> = {};

  test.beforeAll(async () => {
    prior = await snapshotSettings(KEYS);
  });

  test.afterAll(async ({ playwright }) => {
    const api = await apiContext(playwright);
    const restore: Record<string, unknown> = {};
    for (const key of KEYS) {
      const value = prior[key];
      if (value === null || value === undefined) {
        restore[key] = DEFAULTS[key];
      } else if (key === 'relatedProductsRules') {
        // Stored as JSON text; the save API validates it as an object.
        restore[key] = JSON.parse(value);
      } else if (key === 'crossSellFallbackEnabled') {
        // The toggle saves a real boolean, which the setting table stores as
        // the TEXT 'true'/'false' — a representation the validation schema
        // (0/1/'0'/'1'/true/false) rejects. Convert back before posting.
        restore[key] = value === 'true' ? true : value === 'false' ? false : value;
      } else {
        restore[key] = value;
      }
    }
    const response = await api.post('/api/settings', { data: restore });
    const ok = response.ok();
    const body = ok ? '' : await response.text();
    await api.dispose();
    if (!ok) {
      // A rejected restore silently leaves the live store's settings on the
      // spec's test values — fail loudly instead.
      throw new Error(
        `Settings restore failed (${response.status()}): ${body.slice(0, 300)}`
      );
    }
  });

  test('both recommendation cards live inside the single catalog form', async ({
    page
  }) => {
    await page.goto('/admin/setting/catalog');

    const form = page.locator('#catalogSetting');
    await expect(form.getByText('Related products').first()).toBeVisible();
    await expect(
      form.getByText('Frequently bought together').first()
    ).toBeVisible();
    await expect(
      form.locator('[name="crossSellMinPairCount"]')
    ).toBeVisible();
    // The merge regression: exactly ONE Save for the whole page.
    await expect(form.locator('button[type="submit"]')).toHaveCount(1);
  });

  test('saving the merged form persists gates AND the rules object intact', async ({
    page
  }) => {
    await page.goto('/admin/setting/catalog');

    const pairCount = page.locator('[name="crossSellMinPairCount"]');
    await expect(pairCount).toBeVisible();
    await pairCount.fill('4');

    await page.locator('#catalogSetting button[type="submit"]').click();
    await expect(
      page.getByText('Catalog settings have been saved successfully!')
    ).toBeVisible();

    expect(await getSettingValue('crossSellMinPairCount')).toBe('4');
    // The rules object rode the same submit through the headless editor —
    // it must round-trip as a structurally valid config, not a string blob.
    const rules = JSON.parse(
      (await getSettingValue('relatedProductsRules')) ?? 'null'
    );
    expect(rules).not.toBeNull();
    expect(typeof rules.enabled).toBe('boolean');
    expect(Array.isArray(rules.rules)).toBe(true);
  });

  test('Recompute now rebuilds the co-purchase stats and reports it inline', async ({
    page
  }) => {
    test.setTimeout(120_000);
    const db = getDb();
    const { rows: before } = await db.query(
      `SELECT computed_at FROM product_stat_meta WHERE id = 1`
    );

    await page.goto('/admin/setting/catalog');
    const button = page.getByRole('button', { name: 'Recompute now' });
    await expect(button).toBeVisible();
    await button.click();

    await expect(
      page.getByText('Co-purchase statistics recomputed')
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByText(/Co-purchase data last computed/)
    ).toBeVisible();

    const { rows: after } = await db.query(
      `SELECT computed_at FROM product_stat_meta WHERE id = 1`
    );
    expect(after).toHaveLength(1);
    expect(after[0].computed_at).not.toBeNull();
    if (before.length > 0 && before[0].computed_at) {
      expect(new Date(after[0].computed_at).getTime()).toBeGreaterThan(
        new Date(before[0].computed_at).getTime()
      );
    }
  });
});

import { expect, test } from '@playwright/test';
import { getDb } from '../../../shared/db.js';
import {
  cleanupRecoWorld,
  createRecoWorld,
  type RecoWorld
} from '../../../shared/recommendationDb.js';

/**
 * The Recommendations card on the product edit page (spec 05 § 10.2).
 *
 * Serial and ORDER-DEPENDENT: the mode saved in the staleness spec is the
 * state the picks specs run against (manual_only ⇒ the preview must equal
 * the picks — the sharpest possible assertion).
 *
 * Covered regressions:
 *   - preview staleness: the page form saves via fetch with NO reload, so
 *     the "Shoppers will see" preview must refetch on its own after Save
 *     (live bug found by The Nguyen during manual testing);
 *   - reverting out of `custom` mode must NULL the stored rules, never
 *     leave a dormant snapshot (§ 6.4).
 */

test.describe.configure({ mode: 'serial' });

const NAV_TIMEOUT = 60_000;

let world: RecoWorld;

test.describe('admin / product recommendations card', () => {
  test.beforeAll(async () => {
    await cleanupRecoWorld();
    world = await createRecoWorld();
  });

  test.afterAll(async () => {
    await cleanupRecoWorld();
  });

  /** The related "Shoppers will see" box ('(frequently bought together)' is a different, non-exact text). */
  const relatedPreview = (page: import('@playwright/test').Page) =>
    page
      .locator('div.rounded-md.border-divider')
      .filter({ has: page.getByText('Shoppers will see', { exact: true }) });

  test('renders the saved custom configuration with a live preview', async ({
    page
  }) => {
    test.setTimeout(120_000);
    await page.goto(`/admin/products/edit/${world.anchor.uuid}`, {
      timeout: NAV_TIMEOUT
    });

    await expect(page.getByText('Recommendations').first()).toBeVisible({
      timeout: NAV_TIMEOUT
    });
    // RadioGroupField renders base-ui radios: a button[role=radio] wrapping
    // a hidden native input that carries id `field-<rhf name>-<value>` and
    // the checked state. Assert on the input, click the wrapping button.
    await expect(
      page.locator('#field-related_products_mode-custom')
    ).toBeChecked();
    await expect(page.getByText('Overridden on this product')).toBeVisible();

    // Diagnostics load async after mount — the preview reflects the SAVED
    // custom rules: same_category, sales-ranked, fallback off.
    const preview = relatedPreview(page);
    await expect(preview.getByText(world.pBest.name)).toBeVisible({
      timeout: 20_000
    });
    await expect(preview.getByText(world.pGood.name)).toBeVisible();
    await expect(preview.getByText(world.pDisabled.name)).toHaveCount(0);
  });

  test('switching mode + Save refreshes the preview without a reload and NULLs the rules', async ({
    page
  }) => {
    test.setTimeout(120_000);
    await page.goto(`/admin/products/edit/${world.anchor.uuid}`, {
      timeout: NAV_TIMEOUT
    });
    const preview = relatedPreview(page);
    await expect(preview.getByText(world.pBest.name)).toBeVisible({
      timeout: 20_000
    });

    // base-ui renders the styled radio span with the hidden native input as
    // the NEXT sibling — target "the item directly before the input".
    await page
      .locator(
        '[data-slot="radio-group-item"]:has(+ #field-related_products_mode-manual_only)'
      )
      .click();
    // Unsaved-mode warning appears immediately.
    await expect(page.getByText(/Mode changed/)).toBeVisible();

    // Marker survives only if the page does NOT reload.
    await page.evaluate(() => {
      (window as unknown as Record<string, boolean>).__e2eNoReload = true;
    });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Product updated successfully')).toBeVisible({
      timeout: 30_000
    });

    // The preview refetches by itself: manual_only with zero picks.
    await expect(
      preview.getByText(
        'Shoppers will see no related products for this product with the current configuration.'
      )
    ).toBeVisible({ timeout: 20_000 });
    await expect(preview.getByText(world.pBest.name)).toHaveCount(0);
    expect(
      await page.evaluate(
        () => (window as unknown as Record<string, boolean>).__e2eNoReload
      )
    ).toBe(true);

    const db = getDb();
    const { rows } = await db.query(
      `SELECT related_products_mode, related_products_rules
         FROM product WHERE product_id = $1`,
      [world.anchor.productId]
    );
    expect(rows[0].related_products_mode).toBe('manual_only');
    expect(rows[0].related_products_rules).toBeNull();
  });

  test('adding a manual pick through the selector updates the list and the preview', async ({
    page
  }) => {
    test.setTimeout(120_000);
    await page.goto(`/admin/products/edit/${world.anchor.uuid}`, {
      timeout: NAV_TIMEOUT
    });
    const preview = relatedPreview(page);
    await expect(preview).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(0);

    // First "Add products" = the related picks list.
    await page.getByRole('button', { name: 'Add products' }).first().click();
    const search = page.getByPlaceholder('Search products');
    await expect(search).toBeVisible();
    await search.fill(world.pOther.name);
    const selectButton = page.getByRole('button', { name: 'Select' }).first();
    await expect(selectButton).toBeVisible({ timeout: 20_000 });
    await selectButton.click();
    await page.keyboard.press('Escape');

    // The pick row appears (links refetch on change, no form save needed)…
    await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(1, {
      timeout: 20_000
    });
    // …and the saved mode is manual_only, so the preview is exactly the pick.
    await expect(preview.getByText(world.pOther.name)).toBeVisible({
      timeout: 20_000
    });
    await expect(preview.getByText('manual pick')).toBeVisible();

    const db = getDb();
    const { rows } = await db.query(
      `SELECT 1 FROM product_link
        WHERE product_id = $1 AND linked_product_id = $2 AND type = 'related'`,
      [world.anchor.productId, world.pOther.productId]
    );
    expect(rows).toHaveLength(1);
  });

  test('removing the pick empties the list and the preview again', async ({
    page
  }) => {
    test.setTimeout(120_000);
    await page.goto(`/admin/products/edit/${world.anchor.uuid}`, {
      timeout: NAV_TIMEOUT
    });
    const removeButton = page.getByRole('button', { name: 'Remove' });
    await expect(removeButton).toHaveCount(1, { timeout: 20_000 });
    await removeButton.click();
    await expect(removeButton).toHaveCount(0, { timeout: 20_000 });

    await expect(
      relatedPreview(page).getByText(
        'Shoppers will see no related products for this product with the current configuration.'
      )
    ).toBeVisible({ timeout: 20_000 });

    const db = getDb();
    const { rows } = await db.query(
      `SELECT 1 FROM product_link WHERE product_id = $1 AND type = 'related'`,
      [world.anchor.productId]
    );
    expect(rows).toHaveLength(0);
  });

  test('a gated co-purchase candidate can be pinned into the FBT picks', async ({
    page
  }) => {
    test.setTimeout(120_000);
    await page.goto(`/admin/products/edit/${world.anchor.uuid}`, {
      timeout: NAV_TIMEOUT
    });

    // The seeded pair (6 co-orders, anchor 10, lift 3) passes the default
    // gates, so pOther is listed as a candidate with a Pin action.
    const pinButton = page.getByRole('button', { name: 'Pin' }).first();
    await expect(pinButton).toBeVisible({ timeout: 20_000 });
    await pinButton.click();

    await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(1, {
      timeout: 20_000
    });
    const db = getDb();
    const { rows } = await db.query(
      `SELECT 1 FROM product_link
        WHERE product_id = $1 AND linked_product_id = $2 AND type = 'cross_sell'`,
      [world.anchor.productId, world.pOther.productId]
    );
    expect(rows).toHaveLength(1);

    // Unpin to leave the world clean for any later spec.
    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByRole('button', { name: 'Remove' })).toHaveCount(0, {
      timeout: 20_000
    });
  });
});

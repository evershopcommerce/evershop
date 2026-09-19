import { expect, test } from '@playwright/test';
import {
  cleanupRecoWorld,
  createRecoWorld,
  type RecoWorld
} from '../../../shared/recommendationDb.js';

/**
 * Cart-page FBT widget (specifications/06 D-W1-1..7): aggregated co-purchase
 * candidates across the cart, deduped against it, on the cart route's
 * `content` area.
 *
 * Guest-cart recipe (verified against the middleware chain): a plain page
 * visit issues the signed `sid` cookie (saveUninitialized defaults true);
 * `page.request` shares the browser context's cookie jar, so
 * POST /api/cart/mine/items binds the cart to that session; /cart then
 * renders the same session's cart via `myCart`.
 *
 * The suite-wide storageState is the ADMIN session (asid cookie) — harmless,
 * but each test here opts into a CLEAN context so carts never leak between
 * tests through the shared guest cookie.
 */

test.describe.configure({ mode: 'serial' });

test.use({ storageState: { cookies: [], origins: [] } });

let world: RecoWorld;

test.describe('storefront / cart FBT shelf', () => {
  test.beforeAll(async () => {
    await cleanupRecoWorld();
    world = await createRecoWorld();
  });

  test.afterAll(async () => {
    await cleanupRecoWorld();
  });

  test('aggregates co-purchase partners for the cart and excludes in-cart items', async ({
    page
  }) => {
    // Issue the guest session cookie, then build the cart over HTTP.
    await page.goto('/');
    const add = await page.request.post('/api/cart/mine/items', {
      data: { sku: world.anchor.sku, qty: 1 }
    });
    expect(add.ok()).toBe(true);

    await page.goto('/cart');
    const shelf = page
      .locator('.evershop-recommendation-shelf')
      .filter({ hasText: world.cartFbtHeading });
    await expect(shelf).toHaveCount(1);
    // The seeded pair (anchor ↔ pOther) passes the default gates.
    await expect(shelf.getByText(world.pOther.name)).toBeVisible();
    const text = await shelf.innerText();
    for (const absent of [
      world.anchor.name, // in the cart
      world.pDisabled.name,
      world.pOos.name,
      world.pExcluded.name
    ]) {
      expect(text).not.toContain(absent);
    }

    // Add the recommended partner to the cart → it must vanish from the
    // shelf (in-cart exclusion is live, not cached).
    const addPartner = await page.request.post('/api/cart/mine/items', {
      data: { sku: world.pOther.sku, qty: 1 }
    });
    expect(addPartner.ok()).toBe(true);
    await page.goto('/cart');
    const shelvesAfter = page
      .locator('.evershop-recommendation-shelf')
      .filter({ hasText: world.cartFbtHeading });
    // The shelf may still render (bestseller fallback, depending on the
    // store's live setting) — but never the in-cart partner.
    if ((await shelvesAfter.count()) > 0) {
      const after = await shelvesAfter.innerText();
      expect(after).not.toContain(world.pOther.name);
      expect(after).not.toContain(world.anchor.name);
    }
  });

  test('removing the last item hides the shelf without a reload (live-sync regression)', async ({
    page
  }) => {
    // Owner-reported bug: the SSR-baked shelf survived emptying the cart —
    // the main content flipped to "continue shopping" while stale
    // recommendations kept rendering below it.
    await page.goto('/');
    const add = await page.request.post('/api/cart/mine/items', {
      data: { sku: world.anchor.sku, qty: 1 }
    });
    expect(add.ok()).toBe(true);

    await page.goto('/cart');
    const shelf = page
      .locator('.evershop-recommendation-shelf')
      .filter({ hasText: world.cartFbtHeading });
    await expect(shelf).toHaveCount(1);

    // Marker survives only if the page does NOT reload.
    await page.evaluate(() => {
      (window as unknown as Record<string, boolean>).__e2eNoReload = true;
    });
    await page.getByRole('button', { name: 'Remove' }).click();

    await expect(shelf).toHaveCount(0, { timeout: 15_000 });
    expect(
      await page.evaluate(
        () => (window as unknown as Record<string, boolean>).__e2eNoReload
      )
    ).toBe(true);
  });

  test('an empty cart renders no shelf at all', async ({ page }) => {
    // Fresh context (storageState is clean per test) — no cart exists.
    await page.goto('/cart');
    await expect(
      page
        .locator('.evershop-recommendation-shelf')
        .filter({ hasText: world.cartFbtHeading })
    ).toHaveCount(0);
  });
});

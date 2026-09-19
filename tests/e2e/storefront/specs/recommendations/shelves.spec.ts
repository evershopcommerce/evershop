import { expect, test, type Locator } from '@playwright/test';
import {
  cleanupRecoWorld,
  createRecoWorld,
  type RecoWorld
} from '../../../shared/recommendationDb.js';

/**
 * Storefront recommendation shelves on the product page (spec 05 § 9).
 *
 * The world (shared/recommendationDb.ts) is built so every assertion is
 * deterministic against a live store DB:
 *   - the anchor uses CUSTOM related rules (same_category, fallback OFF), so
 *     the related shelf is exactly {pBest, pGood} no matter what the global
 *     settings say;
 *   - the FBT pair (anchor ↔ pOther) is seeded to pass the default gates,
 *     so pOther must rank first; fallback items after it may or may not
 *     exist depending on the store's crossSellFallbackEnabled — asserted
 *     as "first", not "only";
 *   - manualAnchor pins the manual_only regression (the live bug where rule
 *     and fallback items leaked past manual_only);
 *   - emptyAnchor proves the empty-state contract: zero products → the
 *     widget renders NOTHING, heading included.
 */

test.describe.configure({ mode: 'serial' });

let world: RecoWorld;

/** Positions of the given names inside the locator's text (-1 = absent). */
async function namePositions(
  scope: Locator,
  names: string[]
): Promise<number[]> {
  const text = await scope.innerText();
  return names.map((name) => text.indexOf(name));
}

test.describe('storefront / recommendation shelves', () => {
  test.beforeAll(async () => {
    await cleanupRecoWorld();
    world = await createRecoWorld();
  });

  test.afterAll(async () => {
    await cleanupRecoWorld();
  });

  test('related shelf shows rule results sales-ranked, without gated products or the anchor', async ({
    page
  }) => {
    await page.goto(`/product/${world.anchor.uuid}`);

    // The live store may have its own recommendation widgets on productView
    // — assert only on the shelves carrying THIS world's headings.
    const shelves = page.locator('.evershop-recommendation-shelf');
    const related = shelves.filter({ hasText: world.relatedHeading });
    await expect(related).toHaveCount(1);
    await expect(related.getByText(world.pBest.name)).toBeVisible();
    await expect(related.getByText(world.pGood.name)).toBeVisible();

    // Sales rank: pBest (9 orders) before pGood (5 orders).
    const [bestAt, goodAt] = await namePositions(related, [
      world.pBest.name,
      world.pGood.name
    ]);
    expect(bestAt).toBeGreaterThanOrEqual(0);
    expect(bestAt).toBeLessThan(goodAt);

    // Gating: disabled, out-of-stock, and excluded products never render;
    // the anchor never recommends itself (its name lives in the PDP title
    // only — the shelf scope must not contain it).
    const relatedText = await related.innerText();
    for (const absent of [
      world.pDisabled.name,
      world.pOos.name,
      world.pExcluded.name,
      world.anchor.name
    ]) {
      expect(relatedText).not.toContain(absent);
    }
  });

  test('FBT shelf ranks the co-purchase partner first', async ({ page }) => {
    await page.goto(`/product/${world.anchor.uuid}`);

    const fbt = page
      .locator('.evershop-recommendation-shelf')
      .filter({ hasText: world.fbtHeading });
    await expect(fbt).toHaveCount(1);
    await expect(fbt.getByText(world.pOther.name)).toBeVisible();

    // The gated co-purchase result outranks any bestseller-fallback items
    // that may follow it (fallback depends on a live global setting, so we
    // assert "first", not "only").
    const positions = await namePositions(fbt, [
      world.pOther.name,
      world.pBest.name,
      world.pGood.name
    ]);
    expect(positions[0]).toBeGreaterThanOrEqual(0);
    for (const later of positions.slice(1)) {
      if (later >= 0) {
        expect(positions[0]).toBeLessThan(later);
      }
    }
    const fbtText = await fbt.innerText();
    for (const absent of [
      world.pDisabled.name,
      world.pOos.name,
      world.pExcluded.name,
      world.anchor.name
    ]) {
      expect(fbtText).not.toContain(absent);
    }
  });

  test('manual_only shows exactly the picks — no rule or fallback leakage', async ({
    page
  }) => {
    await page.goto(`/product/${world.manualAnchor.uuid}`);

    const shelves = page.locator('.evershop-recommendation-shelf');
    const related = shelves.filter({ hasText: world.relatedHeading });
    await expect(related).toHaveCount(1);
    await expect(related.getByText(world.pOther.name)).toBeVisible();
    // FBT is manual_only with zero picks → this world's FBT shelf is absent.
    await expect(shelves.filter({ hasText: world.fbtHeading })).toHaveCount(0);

    // Regression for the live bug: same-category products and bestsellers
    // must NOT fill remaining slots when the mode is manual picks only.
    const text = await related.innerText();
    for (const absent of [
      world.pBest.name,
      world.pGood.name,
      world.anchor.name
    ]) {
      expect(text).not.toContain(absent);
    }
  });

  test('upsell shelf derives pricier rule matches from the related rules — no fallback', async ({
    page
  }) => {
    // The anchor (price 20) uses custom same_category rules; pBest (30) and
    // pGood (25) are the only pricier same-category members.
    await page.goto(`/product/${world.anchor.uuid}`);

    const upsell = page
      .locator('.evershop-recommendation-shelf')
      .filter({ hasText: world.upsellHeading });
    await expect(upsell).toHaveCount(1);
    await expect(upsell.getByText(world.pBest.name)).toBeVisible();
    await expect(upsell.getByText(world.pGood.name)).toBeVisible();

    // Sales-ranked like the related shelf: pBest (9 orders) first.
    const [bestAt, goodAt] = await namePositions(upsell, [
      world.pBest.name,
      world.pGood.name
    ]);
    expect(bestAt).toBeGreaterThanOrEqual(0);
    expect(bestAt).toBeLessThan(goodAt);

    // Same-price/cheaper products and gated ones never appear; no bestseller
    // fill from outside the rules.
    const text = await upsell.innerText();
    for (const absent of [
      world.pOther.name,
      world.pDisabled.name,
      world.pOos.name,
      world.pExcluded.name,
      world.anchor.name
    ]) {
      expect(text).not.toContain(absent);
    }
  });

  test('manual_only products render no upsell shelf — the rules opt-out extends to the derived shelf', async ({
    page
  }) => {
    await page.goto(`/product/${world.manualAnchor.uuid}`);
    await expect(
      page
        .locator('.evershop-recommendation-shelf')
        .filter({ hasText: world.upsellHeading })
    ).toHaveCount(0);
  });

  test('empty resolution renders no shelf at all — heading included', async ({
    page
  }) => {
    await page.goto(`/product/${world.emptyAnchor.uuid}`);

    await expect(page.getByText(world.emptyAnchor.name).first()).toBeVisible();
    await expect(page.locator('.evershop-recommendation-shelf')).toHaveCount(0);
    await expect(page.getByText(world.relatedHeading)).toHaveCount(0);
    await expect(page.getByText(world.fbtHeading)).toHaveCount(0);
  });
});

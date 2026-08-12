import { expect, test, type Page } from '@playwright/test';
import {
  cleanupShippingWorld,
  FLAT_COST,
  getRateColumns,
  PRICE_TIERS,
  seedShippingWorld,
  SWITCH_FLAT_COST,
  WEIGHT_TIERS,
  type ShippingWorld
} from '../../../shared/shippingDb.js';

/**
 * Core shipping method → Zone Rates → rate dialog (RatePanel) end-to-end.
 *
 * Regression guard for two 2026-08 bugs found while editing a tiered rate:
 *   1. The "Calculation type" radio always opened on "Flat rate" and the tier
 *      tables were empty — the MethodsList query never selected
 *      priceBasedCost/weightBasedCost and RatePanel mounted the editors with
 *      lines={[]}.
 *   2. Once seeded, a rate with N tiers showed only the LAST tier — the
 *      editors appended one line per append() call, and under the dialog's
 *      `shouldUnregister: true` form consecutive appends collapse to the last
 *      write. (Seeding is one atomic append(array) now.)
 *
 * Also covers: a 0 min-price first tier must render as "0" (was blanked by a
 * `||` fallback), flat rates still prefill, save round-trips keep tiers
 * intact, and switching the calculation type nulls the other cost columns.
 *
 * Runs against the live dev DB — serial mode, world seeded in beforeAll and
 * swept by marker in afterAll (see shared/shippingDb.ts).
 */

test.describe('admin / core shipping rate dialog', () => {
  test.describe.configure({ mode: 'serial' });

  let world: ShippingWorld;

  test.beforeAll(async () => {
    await cleanupShippingWorld(); // sweep leftovers from interrupted runs
    world = await seedShippingWorld();
  });

  test.afterAll(async () => {
    await cleanupShippingWorld();
  });

  /** Open the method-edit dialog from the providers settings page. */
  async function openMethodDialog(page: Page): Promise<void> {
    // Generous timeout: the first hit compiles the admin bundle in dev mode.
    await page.goto('/admin/setting/shippingProviders', { timeout: 120_000 });
    await page
      .getByRole('row', { name: world.methodName })
      .getByRole('button', { name: 'Edit' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Zone Rates' })
    ).toBeVisible();
  }

  /**
   * Calculation-type radio, addressed by RadioGroupField's deterministic item
   * id (`field-<name>-<value>`). The visible label text is NOT associated with
   * the radio button (a11y gap in RadioGroupField), so role+name can't match.
   */
  function calcRadio(page: Page, value: string) {
    return page.locator(`#field-calculation_type-${value}`);
  }

  /**
   * Open a zone's rate dialog from inside the method dialog. Scoped to the
   * dialog so the zone name doesn't also match the method table's
   * "Zones served" cell underneath.
   */
  async function openRateDialog(page: Page, zoneName: string): Promise<void> {
    await page
      .getByRole('dialog')
      .getByRole('row', { name: zoneName })
      .getByRole('button', { name: 'Edit' })
      .click();
    await expect(calcRadio(page, 'flat_rate')).toBeVisible();
  }

  test('price-based rate opens with its type selected and ALL tiers seeded', async ({
    page
  }) => {
    await openMethodDialog(page);
    await openRateDialog(page, world.priceZone.name);

    await expect(calcRadio(page, 'price_based_rate')).toBeChecked();
    await expect(calcRadio(page, 'flat_rate')).not.toBeChecked();

    // Both tiers, not just the last one.
    await expect(
      page.locator('input[name^="price_based_cost."][name$=".min_price"]')
    ).toHaveCount(PRICE_TIERS.length);
    // The 0 min-price first tier must show "0", not blank.
    await expect(
      page.locator('input[name="price_based_cost.0.min_price"]')
    ).toHaveValue('0');
    await expect(
      page.locator('input[name="price_based_cost.0.cost"]')
    ).toHaveValue('10');
    await expect(
      page.locator('input[name="price_based_cost.1.min_price"]')
    ).toHaveValue('50');
    await expect(
      page.locator('input[name="price_based_cost.1.cost"]')
    ).toHaveValue('5.5');
  });

  test('weight-based rate opens with its type selected and ALL tiers seeded', async ({
    page
  }) => {
    await openMethodDialog(page);
    await openRateDialog(page, world.weightZone.name);

    await expect(calcRadio(page, 'weight_based_rate')).toBeChecked();

    await expect(
      page.locator('input[name^="weight_based_cost."][name$=".min_weight"]')
    ).toHaveCount(WEIGHT_TIERS.length);
    await expect(
      page.locator('input[name="weight_based_cost.0.min_weight"]')
    ).toHaveValue('0');
    await expect(
      page.locator('input[name="weight_based_cost.0.cost"]')
    ).toHaveValue('4');
    await expect(
      page.locator('input[name="weight_based_cost.1.min_weight"]')
    ).toHaveValue('2.5');
    await expect(
      page.locator('input[name="weight_based_cost.1.cost"]')
    ).toHaveValue('8');
  });

  test('flat rate opens with Flat rate selected and the cost prefilled', async ({
    page
  }) => {
    await openMethodDialog(page);
    await openRateDialog(page, world.flatZone.name);

    await expect(calcRadio(page, 'flat_rate')).toBeChecked();
    await expect(page.locator('input[name="cost"]')).toHaveValue(
      String(FLAT_COST)
    );
  });

  test('saving an untouched tiered rate round-trips all tiers', async ({
    page
  }) => {
    await openMethodDialog(page);
    await openRateDialog(page, world.priceZone.name);
    await page.getByRole('button', { name: 'Save rate' }).click();
    // Saving closes both the rate dialog and the method dialog.
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const row = await getRateColumns(world.methodId, world.priceZone.zoneId);
    expect(row).not.toBeNull();
    expect(row!.cost).toBeNull();
    expect(row!.weight_based_cost).toBeNull();
    expect(row!.price_based_cost).toHaveLength(PRICE_TIERS.length);
    PRICE_TIERS.forEach((tier, i) => {
      expect(Number(row!.price_based_cost![i].min_price)).toBe(tier.min_price);
      expect(Number(row!.price_based_cost![i].cost)).toBe(tier.cost);
    });

    // And the dialog still shows both tiers after the round trip.
    await openMethodDialog(page);
    await openRateDialog(page, world.priceZone.name);
    await expect(calcRadio(page, 'price_based_rate')).toBeChecked();
    await expect(
      page.locator('input[name^="price_based_cost."][name$=".min_price"]')
    ).toHaveCount(PRICE_TIERS.length);
    await expect(
      page.locator('input[name="price_based_cost.1.cost"]')
    ).toHaveValue('5.5');
  });

  test('switching calculation type saves the new tiers and nulls the other costs', async ({
    page
  }) => {
    await openMethodDialog(page);
    await openRateDialog(page, world.switchZone.name);

    await expect(calcRadio(page, 'flat_rate')).toBeChecked();
    await expect(page.locator('input[name="cost"]')).toHaveValue(
      String(SWITCH_FLAT_COST)
    );

    // Click the VISIBLE radio button — the `field-…` id sits on Base UI's
    // hidden mirror input, whose hit-box lies outside the nested dialog and
    // gets intercepted by the inert parent dialog. The buttons carry no
    // accessible name (see calcRadio), so address by option order:
    // [flat_rate, price_based_rate, weight_based_rate].
    await page.getByRole('radiogroup').getByRole('radio').nth(1).click();
    await expect(calcRadio(page, 'price_based_rate')).toBeChecked();
    // Fresh switch seeds one empty tier row.
    await expect(
      page.locator('input[name^="price_based_cost."][name$=".min_price"]')
    ).toHaveCount(1);
    await page.locator('input[name="price_based_cost.0.min_price"]').fill('0');
    await page.locator('input[name="price_based_cost.0.cost"]').fill('3');
    await page.getByRole('button', { name: 'Save rate' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const row = await getRateColumns(world.methodId, world.switchZone.zoneId);
    expect(row).not.toBeNull();
    expect(row!.cost).toBeNull();
    expect(row!.weight_based_cost).toBeNull();
    expect(row!.price_based_cost).toHaveLength(1);
    expect(Number(row!.price_based_cost![0].min_price)).toBe(0);
    expect(Number(row!.price_based_cost![0].cost)).toBe(3);

    // Reopen: the derivation must now pick Price-based for the saved shape
    // (UI-written jsonb, not just the seeded fixtures).
    await openMethodDialog(page);
    await openRateDialog(page, world.switchZone.name);
    await expect(calcRadio(page, 'price_based_rate')).toBeChecked();
    await expect(
      page.locator('input[name="price_based_cost.0.cost"]')
    ).toHaveValue('3');
  });
});

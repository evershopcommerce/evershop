import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActiveChangesetId } from '../../../shared/changesetDb.js';
import { discardAdminChangesets } from '../../../shared/db.js';
import { seedWidgetPlacement } from '../../../shared/pbApi.js';
import { EditorPage } from '../../pages/EditorPage.js';
import { PaletteTab } from '../../pages/PaletteTab.js';

/**
 * Rendering smoke for the left-rail tabs: Widgets, Pages, Layers.
 *
 *   - Widgets: every registered widget surfaces as a draggable card.
 *   - Pages: at least one editable route is listed; current route is
 *     badged "Current"; non-current routes carry "Live" or "Draft".
 *   - Layers: empty (or near-empty) on a fresh changeset; updates when
 *     a placement op lands.
 *
 * Source of truth for the widget list is bootstrap-time registrations in
 * `modules/cms/bootstrap.ts` + `modules/catalog/bootstrap.js`. We assert
 * a representative subset of names rather than a strict count — the
 * registry is open to extension and a strict count would fail every
 * time a new widget ships.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_META_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  '.auth',
  'admin.meta.json'
);
function loadAdminUserId(): number {
  return (
    JSON.parse(readFileSync(ADMIN_META_PATH, 'utf8')) as {
      adminUserId: number;
    }
  ).adminUserId;
}

/**
 * Canonical widget catalog — labels (column 1) are what the palette
 * renders as accessible-name prefixes. If a widget is added/renamed in
 * a bootstrap file, append/edit it here too.
 */
const EXPECTED_WIDGET_LABELS = [
  // CMS
  'Columns',
  'Text block',
  'Menu',
  'Banner',
  'Simple Slideshow',
  'Brand story',
  'Category mosaic',
  'Tiered categories',
  'Bento grid',
  'Separator',
  'Section',
  'Split feature',
  'Announcement bar',
  'Coupon block',
  'FAQ block',
  'Trust strip',
  // Catalog
  'Collection products',
  'Collection stack',
  'Collection spotlight',
  'Product hero'
] as const;

test.describe('sidebar / widgets palette', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('palette shows every registered widget', async ({ page }) => {
    const editor = new EditorPage(page);
    const palette = new PaletteTab(page);
    await editor.open('homepage');
    await palette.ensureExpanded();

    // Each registered widget must show as a draggable card. The card's
    // accessible name starts with the registered `name`; matching the
    // start prefix avoids brittleness from the description suffix.
    for (const label of EXPECTED_WIDGET_LABELS) {
      await expect(palette.card(label)).toBeVisible();
    }

    // Sanity check on the total — should be at least the size of the
    // expected set. Strict equality is intentionally avoided so future
    // additions don't break this spec.
    const totalCards = await page
      .locator('.page-builder-editor aside button[draggable="true"]')
      .count();
    expect(totalCards).toBeGreaterThanOrEqual(EXPECTED_WIDGET_LABELS.length);
  });
});

test.describe('sidebar / pages tab', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('pages tab badges current route and lists at least 3 routes', async ({
    page
  }) => {
    const editor = new EditorPage(page);
    const palette = new PaletteTab(page);
    await editor.open('homepage');
    await palette.ensureExpanded();

    const sidebar = page.locator('.page-builder-editor aside');
    // Switch to Pages tab — the icon-only Pages button shares its name
    // attribute with the visible label.
    await sidebar.getByRole('button', { name: /^Pages\b/ }).click();

    // The current route ('homepage' → "Home Page") must carry the
    // "Current" badge.
    const homepageRow = sidebar
      .getByRole('link')
      .filter({ hasText: 'Home Page' });
    await expect(homepageRow).toBeVisible();
    await expect(homepageRow).toContainText('Current');

    // At least a handful of routes are editable in a stock install
    // (homepage, cart, checkout, login, register, … ). Assert >= 3 so a
    // non-stock seed doesn't false-fail.
    const allRows = sidebar.getByRole('link');
    expect(await allRows.count()).toBeGreaterThanOrEqual(3);

    // Every non-current row should carry exactly one of {Live, Draft}.
    // We sample by looking at the first non-current row's badge text.
    const nonCurrent = allRows.filter({ hasNotText: 'Current' });
    const firstNonCurrent = nonCurrent.first();
    await expect(firstNonCurrent).toBeVisible();
    const text = (await firstNonCurrent.textContent()) ?? '';
    expect(text).toMatch(/Live|Draft/);
  });
});

test.describe('sidebar / layers tab', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('layers reflects placements seeded into the changeset', async ({
    page,
    request
  }) => {
    const editor = new EditorPage(page);
    const palette = new PaletteTab(page);
    await editor.open('homepage');

    // Seed a placement op so we have something to inspect on the
    // Layers tab. Use a unique-ish widget name suffix so we can pick it
    // out by accessible-name.
    const changesetId = await getActiveChangesetId(loadAdminUserId());
    expect(changesetId).not.toBeNull();
    await seedWidgetPlacement(request, {
      changesetId: changesetId!,
      route: 'all',
      placementRoute: 'all',
      area: 'content',
      widgetType: 'announcement_bar'
    });
    await page.reload();
    // Wait for editor topbar to come back after reload before sidebar work.
    await expect(page.locator('.page-builder-editor > header')).toBeVisible({
      timeout: 15_000
    });

    await palette.ensureExpanded();
    const sidebar = page.locator('.page-builder-editor aside');
    await sidebar.getByRole('button', { name: /^Layers\b/ }).click();

    // LayerNode renders the widget's *registration name* (e.g.
    // "Announcement bar"), NOT the user-supplied `widget_instance.name`.
    // Match by registration name to find the seeded widget's row. The
    // user's dev DB may have other announcement_bar widgets too — that
    // doesn't matter; we just want to confirm at least one such row
    // surfaces in Layers after the seed.
    const announcementRow = sidebar
      .getByRole('button')
      .filter({ hasText: 'Announcement bar' })
      .first();
    await expect(announcementRow).toBeVisible({ timeout: 5_000 });
  });
});

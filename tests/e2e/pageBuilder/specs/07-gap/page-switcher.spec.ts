import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActiveChangesetId } from '../../../shared/changesetDb.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';
import { seedWidgetPlacement } from '../../../shared/pbApi.js';
import { EditorPage } from '../../pages/EditorPage.js';

/**
 * Page switcher mid-draft. The topbar dropdown ("Switch page") navigates
 * via plain `<a href>` because the draft changeset is global per
 * spec § 5.7 — one draft, all routes. Switching pages should preserve
 * every op the user has staged on other routes.
 *
 * We:
 *   1. Open homepage editor, seed an op on homepage.
 *   2. Open the page switcher and pick "Cart".
 *   3. Verify URL changed to /admin/page-builder/edit/cart.
 *   4. Verify the draft changeset's homepage cursor is untouched.
 *   5. Verify cart's pages-tab badge is "Current" and homepage's is "Draft".
 *
 * (5) closes the loop: after navigating, the Pages tab visibly reflects
 * the same persisted-draft state we verified in the DB.
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

test.describe('page switcher', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('navigating mid-draft preserves the draft on the original route', async ({
    page,
    request
  }) => {
    const editor = new EditorPage(page);
    await editor.open('homepage');
    const changesetId = await getActiveChangesetId(loadAdminUserId());
    expect(changesetId).not.toBeNull();

    // Seed an op on homepage so the page-switcher can show a Draft pill.
    await seedWidgetPlacement(request, {
      changesetId: changesetId!,
      route: 'homepage',
      placementRoute: 'homepage',
      area: 'content',
      widgetType: 'separator'
    });

    // Open the switcher (aria-label="Switch page") and pick Cart.
    // Entries are `<a role="option">` inside a listbox — not plain links.
    await editor.topbar
      .getByRole('button', { name: 'Switch page' })
      .click();
    const cartItem = page
      .getByRole('listbox')
      .getByRole('option', { name: /Cart\b/ });
    await expect(cartItem).toBeVisible();
    await cartItem.click();

    // Navigation lands on the cart editor URL.
    await expect(page).toHaveURL(/\/admin\/page-builder\/edit\/cart\b/);
    await expect(page.locator('.page-builder-editor > header')).toBeVisible({
      timeout: 15_000
    });

    // DB-level: the homepage cursor is preserved (still 2 from the seed).
    const db = getDb();
    const csRow = await db.query<{ cursors: Record<string, number> }>(
      `SELECT route_cursors AS cursors FROM changeset WHERE changeset_id = $1`,
      [changesetId]
    );
    expect(csRow.rows[0].cursors.homepage).toBe(2);

    // Pages tab on the cart editor shows Cart=Current and Home Page=Draft.
    const sidebar = page.locator('.page-builder-editor aside');
    // Expand the rail first (palette tab default is collapsed on entry).
    const expandBtn = sidebar.getByRole('button', { name: 'Expand left rail' });
    if (await expandBtn.isVisible().catch(() => false)) {
      await expandBtn.click();
    }
    await sidebar.getByRole('button', { name: /^Pages\b/ }).click();
    const cartRow = sidebar.getByRole('link').filter({ hasText: 'Cart' });
    const homeRow = sidebar
      .getByRole('link')
      .filter({ hasText: 'Home Page' });
    await expect(cartRow).toContainText('Current');
    await expect(homeRow).toContainText('Draft');
  });
});

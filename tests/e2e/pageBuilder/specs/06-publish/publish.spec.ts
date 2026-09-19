import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActiveChangesetId } from '../../../shared/changesetDb.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';
import { seedWidgetPlacement } from '../../../shared/pbApi.js';
import { EditorPage } from '../../pages/EditorPage.js';
import { PublishDialog } from '../../pages/PublishDialog.js';

/**
 * Publish flow — closes the loop from edit → live storefront.
 *
 *   1. Empty changeset → dialog labels itself "Nothing to publish",
 *      "Publish now" is disabled.
 *   2. Changeset with one widget+placement → dialog shows correct
 *      counts + affected routes.
 *   3. Confirming publish writes `widget_instance` + `widget_placement`
 *      rows to the source tables, marks the changeset `published_at`,
 *      and the storefront URL shows the new widget.
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

test.describe('publish flow', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
    // Also remove any test widgets the previous run inserted, since
    // publish makes them live and they'd survive a changeset discard.
    const db = getDb();
    await db.query(`DELETE FROM widget_instance WHERE name LIKE 'e2e-%'`);
  });

  test('empty changeset → "Nothing to publish", confirm disabled', async ({
    page
  }) => {
    const editor = new EditorPage(page);
    const dialog = new PublishDialog(page);

    await editor.open('homepage');

    // Click Publish from the topbar. The button is enabled even without
    // ops (the dialog itself reports the state).
    await editor.publishButton.click();
    await expect(dialog.dialog).toBeVisible();
    await expect(dialog.title).toContainText('Nothing to publish');
    await expect(dialog.publishNowButton).toBeDisabled();
    await dialog.cancel();
  });

  test('with ops → dialog shows correct counts and affected routes', async ({
    page,
    request
  }) => {
    const editor = new EditorPage(page);
    const dialog = new PublishDialog(page);

    await editor.open('homepage');
    const changesetId = await getActiveChangesetId(loadAdminUserId());
    expect(changesetId).not.toBeNull();
    await seedWidgetPlacement(request, {
      changesetId: changesetId!,
      route: 'homepage',
      placementRoute: 'homepage',
      area: 'content',
      widgetType: 'coupon_block'
    });
    // Reload so the editor refetches operations.
    await page.reload();
    await editor.publishButton.click();

    await expect(dialog.dialog).toBeVisible();
    await expect(dialog.title).toContainText('Publish to the live storefront');
    // summarize() in PublishDialog counts widget_instance ops only for
    // the Added/Updated/Removed badges; placement ops contribute to the
    // affected-routes summary instead. One seeded widget = 1 added.
    expect(await dialog.addedCount()).toBe(1);
    expect(await dialog.affectedRouteCount()).toBe(1);
    await dialog.cancel();
  });

  test('confirming publish writes source rows and surfaces on storefront', async ({
    page,
    request
  }) => {
    const editor = new EditorPage(page);
    const dialog = new PublishDialog(page);

    await editor.open('homepage');
    const changesetId = await getActiveChangesetId(loadAdminUserId());
    const { widgetUuid, placementUuid } = await seedWidgetPlacement(request, {
      changesetId: changesetId!,
      route: 'homepage',
      placementRoute: 'homepage',
      area: 'content',
      widgetType: 'coupon_block'
    });

    await page.reload();
    await editor.publishButton.click();
    await dialog.confirm();

    // Publish dialog closes when the POST resolves. Source tables now
    // contain the widget instance + placement.
    const db = getDb();
    const widget = await db.query<{ uuid: string; name: string }>(
      `SELECT uuid, name FROM widget_instance WHERE uuid = $1`,
      [widgetUuid]
    );
    expect(widget.rows).toHaveLength(1);
    expect(widget.rows[0].name).toMatch(/^e2e-/);

    const placement = await db.query<{
      route: string;
      area: string;
    }>(
      `SELECT route, area FROM widget_placement WHERE uuid = $1`,
      [placementUuid]
    );
    expect(placement.rows).toHaveLength(1);
    expect(placement.rows[0].route).toBe('homepage');
    expect(placement.rows[0].area).toBe('content');

    // Changeset is marked published.
    const cs = await db.query<{ published_at: Date | null }>(
      `SELECT published_at FROM changeset WHERE changeset_id = $1`,
      [changesetId]
    );
    expect(cs.rows[0].published_at).not.toBeNull();

    // Storefront URL now serves the widget. Hit `/` in a fresh request
    // context (logged-out, mirrors a real visitor) and confirm the
    // CouponBlock root class appears in the HTML.
    const storefront = await request.get('/');
    expect(storefront.ok()).toBe(true);
    const html = await storefront.text();
    expect(html).toContain('evershop-coupon-block');
  });
});

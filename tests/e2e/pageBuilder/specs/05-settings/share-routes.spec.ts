import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getActiveChangesetId } from '../../../shared/changesetDb.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';
import { seedWidgetPlacement } from '../../../shared/pbApi.js';
import { EditorPage } from '../../pages/EditorPage.js';
import { SettingsDrawer } from '../../pages/SettingsDrawer.js';

/**
 * Drawer "Share" routes behavior. The recent share-toggle fix (drop on
 * global → All routes auto-selected; uncheck All → widget stays on
 * current route in the same area) is covered here.
 *
 * Setup approach: API-seed the widget + placement directly, then open
 * the editor and click the widget to mount the drawer. This isolates
 * the drawer/share behavior from the drag UI (the cross-frame HTML5
 * drag chain has its own complexity covered in `specs/03-drag-drop/`).
 *
 * The drawer's `initialPlacements` prop is set by `handleAddWidget` on
 * drop; without a drop we exercise the fallback path that reads from
 * `flatLayerWidgets()` (the editor's overlay-applied state). Both
 * paths land in the same `routeMap` shape — what we're verifying is
 * the dropdown's behavior given a known placement set.
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
  const meta = JSON.parse(readFileSync(ADMIN_META_PATH, 'utf8')) as {
    adminUserId: number;
  };
  return meta.adminUserId;
}

test.describe('drawer / share routes', () => {
  // Each spec gets a clean changeset so leftover ops from the previous
  // test don't bleed into assertions.
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  /**
   * Helper: open the editor for `homepage`, seed a widget at the given
   * route+area, then click it in the iframe to mount the drawer.
   * Returns the widget uuid so DB-level assertions can target it.
   */
  async function setupWidgetAndOpenDrawer(
    page: import('@playwright/test').Page,
    request: import('@playwright/test').APIRequestContext,
    args: { placementRoute: string; area: string }
  ): Promise<{ widgetUuid: string; editor: EditorPage; drawer: SettingsDrawer }> {
    const editor = new EditorPage(page);
    const drawer = new SettingsDrawer(page);
    // Opening creates the draft changeset; we then seed into it.
    await editor.open('homepage');

    const changesetId = await getActiveChangesetId(loadAdminUserId());
    expect(
      changesetId,
      'editor created a draft changeset on open'
    ).not.toBeNull();

    const { widgetUuid } = await seedWidgetPlacement(request, {
      changesetId: changesetId!,
      route: 'homepage',
      placementRoute: args.placementRoute,
      area: args.area,
      widgetType: 'coupon_block'
    });

    // Reload so the iframe SSR picks up the seeded widget. Bypass the
    // SessionPicker since we already acknowledged it; we just need a
    // fresh editor render.
    await page.reload();
    // After reload the picker doesn't reappear (sessionAcknowledged is
    // persisted in sessionStorage). Wait for iframe header again.
    const frame = await editor.previewFrame();
    await expect(frame.locator('header').first()).toBeVisible({
      timeout: 20_000
    });

    // Open the drawer by clicking the widget's Settings icon in the
    // hover toolbar. The widget body itself doesn't open the drawer —
    // only the toolbar's gear button posts the `widget-selected`
    // message that mounts SettingsDrawer.
    const widgetEl = frame.locator(`[data-evershop-pb-widget-uid="${widgetUuid}"]`);
    await expect(widgetEl).toBeVisible({ timeout: 10_000 });
    await widgetEl.hover();
    const settingsBtn = widgetEl.getByRole('button', { name: 'Settings' });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();
    await expect(drawer.drawer).toBeVisible();

    return { widgetUuid, editor, drawer };
  }

  test('widget placed at route=all shows "All routes" checked', async ({
    page,
    request
  }) => {
    const { drawer } = await setupWidgetAndOpenDrawer(page, request, {
      placementRoute: 'all',
      area: 'headerTop'
    });

    expect(await drawer.isAllRoutesChecked()).toBe(true);
  });

  test('widget placed at route=homepage shows current route only', async ({
    page,
    request
  }) => {
    const { drawer } = await setupWidgetAndOpenDrawer(page, request, {
      placementRoute: 'homepage',
      area: 'content'
    });

    expect(await drawer.isAllRoutesChecked()).toBe(false);
    expect(await drawer.isRouteChecked('Home Page')).toBe(true);
  });

  test('toggling "All routes" off inserts a homepage placement in the same area', async ({
    page,
    request
  }) => {
    const { drawer, widgetUuid } = await setupWidgetAndOpenDrawer(
      page,
      request,
      { placementRoute: 'all', area: 'headerTop' }
    );

    expect(await drawer.isAllRoutesChecked()).toBe(true);
    await drawer.toggleAllRoutes();

    // Drawer state flips to current-route-only.
    expect(await drawer.isAllRoutesChecked()).toBe(false);
    expect(await drawer.isRouteChecked('Home Page')).toBe(true);

    // DB confirms: a homepage placement was inserted in the SAME area
    // (headerTop, not 'content'), AND the original 'all' placement was
    // deleted. sort_order matches across the swap to dodge the
    // dedupe-flash bug.
    //
    // The handleToggleAll(false) branch does add-then-remove sequentially.
    // The drawer's UI state updates optimistically (so the toggle visibly
    // flips immediately), but the network ops settle a beat later. Poll
    // for both ops to land via expect.poll rather than a fixed wait.
    const adminUserId = loadAdminUserId();
    const changesetId = await getActiveChangesetId(adminUserId);
    const db = getDb();
    const fetchOps = async () =>
      (
        await db.query<{ entity_urn: string; old_payload: any; new_payload: any }>(
          `SELECT entity_urn, old_payload, new_payload FROM changeset_operation
           WHERE changeset_id = $1
             AND entity_urn LIKE 'urn:evershop:cms:widget_placement:%'
           ORDER BY change_order`,
          [changesetId]
        )
      ).rows;

    // Wait for the swap to land: homepage insert + the all-placement
    // delete op must both be present.
    await expect
      .poll(
        async () => {
          const ops = await fetchOps();
          const myInserts = ops.filter(
            (row) => row.new_payload?.widget_instance_uuid === widgetUuid
          );
          const homepageInserts = myInserts.filter(
            (row) => row.new_payload?.route === 'homepage'
          );
          const deletes = ops.filter(
            (row) => row.old_payload && !row.new_payload
          );
          return {
            homepageInsertCount: homepageInserts.length,
            deleteCount: deletes.length
          };
        },
        { timeout: 5000 }
      )
      .toEqual({ homepageInsertCount: 1, deleteCount: 1 });

    const ops = await fetchOps();
    const homepageInsert = ops.find(
      (row) =>
        row.new_payload?.widget_instance_uuid === widgetUuid &&
        row.new_payload?.route === 'homepage'
    )!;
    expect(homepageInsert.new_payload.area).toBe('headerTop');
    expect(homepageInsert.new_payload.sort_order).toBe(100);

    const allInsert = ops.find(
      (row) =>
        row.new_payload?.widget_instance_uuid === widgetUuid &&
        row.new_payload?.route === 'all'
    )!;
    expect(allInsert).toBeDefined();
  });
});

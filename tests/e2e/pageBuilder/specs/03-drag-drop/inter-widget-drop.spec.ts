import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  countOperations,
  getActiveChangesetId
} from '../../../shared/changesetDb.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';
import { seedWidgetPlacement } from '../../../shared/pbApi.js';
import { EditorPage } from '../../pages/EditorPage.js';
import { PaletteTab } from '../../pages/PaletteTab.js';

/**
 * Inter-widget drop. WidgetChrome renders an "after" drop zone immediately
 * below each widget (`data-evershop-pb-after="<widget-uuid>"`).
 * `computeDropSortOrder(zone)` (see `dropSortOrder.ts:24`) walks
 * `previousElementSibling` / `nextElementSibling` to find neighbouring
 * `data-evershop-pb-sort-order` values, returning the midpoint when both
 * exist.
 *
 * Setup: seed two widgets at sort_orders 100 and 200, drop a third onto
 * the first widget's after-zone. Expected midpoint: 150.
 *
 * This is the only spec where the new sort_order is exactly predictable
 * (no pre-existing storefront DOM at this area). The matrix specs assert
 * `Number.isFinite` because pre-rendered components like ShoppingCart sit
 * in the same area and offset the math.
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
 * Drag a palette card onto a specific widget's "after" drop zone. Mirrors
 * `PaletteTab.dragToArea` but targets `[data-evershop-pb-after="<uuid>"]`
 * inside the iframe instead of an AreaStartDropZone.
 */
async function dropAfterWidget(
  page: import('@playwright/test').Page,
  args: {
    widgetLabel: string;
    widgetCode: string;
    afterWidgetUid: string;
  }
): Promise<void> {
  // Ensure the palette is expanded so the source card mounts.
  const expandBtn = page
    .locator('.page-builder-editor aside')
    .getByRole('button', { name: 'Expand left rail' });
  if (await expandBtn.isVisible().catch(() => false)) {
    await expandBtn.click();
  }
  await page.evaluate(
    ({ widgetLabel, widgetCode, afterWidgetUid }) => {
      const cards = Array.from(
        document.querySelectorAll(
          '.page-builder-editor aside button[draggable="true"]'
        )
      ) as HTMLButtonElement[];
      const card = cards.find((c) =>
        (c.textContent || '').trim().startsWith(widgetLabel)
      );
      if (!card) {
        throw new Error(`Palette card "${widgetLabel}" not found.`);
      }
      const iframe = document.querySelector(
        '.page-builder-editor iframe'
      ) as HTMLIFrameElement | null;
      if (!iframe?.contentDocument) {
        throw new Error('Editor iframe missing.');
      }
      const zone = iframe.contentDocument.querySelector(
        `[data-evershop-pb-after="${afterWidgetUid}"]`
      ) as HTMLElement | null;
      if (!zone) {
        throw new Error(
          `WidgetChrome after-drop-zone for widget ${afterWidgetUid} not found.`
        );
      }
      const dt = new DataTransfer();
      dt.setData('application/x-evershop-widget', widgetCode);
      dt.setData('text/plain', widgetCode);
      card.dispatchEvent(
        new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt
        })
      );
      zone.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt
        })
      );
    },
    args
  );
}

test.describe('drag-drop / inter-widget', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('drop between two widgets gets midpoint sort_order', async ({
    page,
    request
  }) => {
    const editor = new EditorPage(page);
    const palette = new PaletteTab(page);
    await editor.open('homepage');
    const changesetId = await getActiveChangesetId(loadAdminUserId());
    expect(changesetId).not.toBeNull();

    // Seed widget A at sort_order=100.
    const { widgetUuid: uidA } = await seedWidgetPlacement(request, {
      changesetId: changesetId!,
      route: 'homepage',
      placementRoute: 'all',
      area: 'content',
      widgetType: 'separator',
      sortOrder: 100
    });
    // Seed widget B at sort_order=200.
    await seedWidgetPlacement(request, {
      changesetId: changesetId!,
      route: 'homepage',
      placementRoute: 'all',
      area: 'content',
      widgetType: 'separator',
      sortOrder: 200
    });

    await page.reload();
    await expect(page.locator('.page-builder-editor > header')).toBeVisible({
      timeout: 15_000
    });
    // Make sure both seeded widgets are rendered (drop-zone math needs
    // the sort_order attribute on their DOM nodes).
    const frame = await editor.previewFrame();
    await expect(
      frame.locator(`[data-evershop-pb-widget-uid="${uidA}"]`)
    ).toBeVisible({ timeout: 10_000 });

    const opsBefore = await countOperations(changesetId!);
    await palette.ensureExpanded();
    await dropAfterWidget(page, {
      widgetLabel: 'Text block',
      widgetCode: 'text_block',
      afterWidgetUid: uidA
    });

    await expect
      .poll(() => countOperations(changesetId!), { timeout: 5_000 })
      .toBeGreaterThanOrEqual(opsBefore + 2);

    const db = getDb();
    const { rows } = await db.query<{ sort_order: number }>(
      `SELECT (new_payload->>'sort_order')::int AS sort_order
       FROM changeset_operation
       WHERE changeset_id = $1
         AND entity_urn LIKE 'urn:evershop:cms:widget_placement:%'
         AND new_payload IS NOT NULL
       ORDER BY change_order DESC LIMIT 1`,
      [changesetId]
    );
    // Midpoint of 100 and 200 — `computeDropSortOrder` returns
    // (prev + next) / 2 when both neighbours have sort_order attributes.
    expect(rows[0].sort_order).toBe(150);
  });
});

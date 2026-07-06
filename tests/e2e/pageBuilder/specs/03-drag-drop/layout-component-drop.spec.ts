import { expect, test } from '@playwright/test';
import {
  countOperations,
  getActiveChangesetId
} from '../../../shared/changesetDb.js';
import { loadAdminUserId } from '../../../shared/adminMeta.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';
import { EditorPage } from '../../pages/EditorPage.js';
import { PaletteTab } from '../../pages/PaletteTab.js';

/**
 * Drops relative to LAYOUT components (not widgets). `Area.tsx` renders an
 * `AreaDropZone` after every renderable in an editable Area — widget
 * instances AND layout components — so a widget can land between two layout
 * components or below the last one. Before this, zones only existed at the
 * area start and after existing widgets, which made a widget-less area like
 * cart's `content` droppable in exactly one place (above the Breadcrumb).
 *
 * Fixture: the `cart` route. Its `content` area renders two layout
 * components at code-defined sort orders — Breadcrumb (`sortOrder: 0`,
 * `base/pages/frontStore/all/Breadcrumb.tsx`) and ShoppingCart
 * (`sortOrder: 10`, `checkout/pages/frontStore/cart/ShoppingCart.tsx`) —
 * and no widgets, so `computeDropSortOrder`'s results are exactly
 * predictable: midpoint (0+10)/2 = 5 between them, prev+1 = 11 after the
 * last one.
 *
 * Zone selectors lean on the DOM contract: each renderable's tagged wrapper
 * (`data-evershop-pb-sort-order`) is immediately followed by its zone, so
 * `[data-evershop-pb-sort-order="0"] + [data-evershop-pb-dropzone]` is "the
 * seam right below Breadcrumb".
 */

const CONTENT = '[data-evershop-area-id="content"]';

/**
 * Drag a palette card onto the drop zone matched by `zoneSelector` inside
 * the iframe. Mirrors `PaletteTab.dragToArea` (manual dragstart + drop with
 * a shared DataTransfer — Playwright's `dragTo` doesn't reliably cross
 * frames for HTML5 DnD) but takes an arbitrary zone selector instead of an
 * area-start id.
 */
async function dropOnZone(
  page: import('@playwright/test').Page,
  args: { widgetLabel: string; widgetCode: string; zoneSelector: string }
): Promise<void> {
  await page.evaluate(
    ({ widgetLabel, widgetCode, zoneSelector }) => {
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
        zoneSelector
      ) as HTMLElement | null;
      if (!zone) {
        throw new Error(`Drop zone "${zoneSelector}" not found in iframe.`);
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

async function lastPlacementSortOrder(changesetId: number): Promise<number> {
  const db = getDb();
  const { rows } = await db.query<{ sort_order: number }>(
    `SELECT (new_payload->>'sort_order')::float AS sort_order
     FROM changeset_operation
     WHERE changeset_id = $1
       AND entity_urn LIKE 'urn:evershop:cms:widget_placement:%'
       AND new_payload IS NOT NULL
     ORDER BY change_order DESC LIMIT 1`,
    [changesetId]
  );
  return rows[0].sort_order;
}

/**
 * Open the cart editor and assert the fixture's shape (two layout wrappers
 * at sort 0 / 10, no widgets in `content`). Returns the changeset id.
 */
async function openCartEditor(
  page: import('@playwright/test').Page
): Promise<number> {
  const editor = new EditorPage(page);
  const palette = new PaletteTab(page);
  await editor.open('cart');
  const changesetId = await getActiveChangesetId(loadAdminUserId());
  expect(changesetId).not.toBeNull();

  const frame = await editor.previewFrame();
  await expect(
    frame.locator(`${CONTENT} > [data-evershop-pb-sort-order="0"]`)
  ).toBeAttached({ timeout: 10_000 });
  await expect(
    frame.locator(`${CONTENT} > [data-evershop-pb-sort-order="10"]`)
  ).toBeAttached();
  // Widgets placed in cart/content would offset the midpoint math — this
  // spec's exact assertions assume the pristine two-layout-component shape.
  await expect(
    frame.locator(`${CONTENT} [data-evershop-pb-widget-uid]`)
  ).toHaveCount(0);

  await palette.ensureExpanded();
  return changesetId!;
}

test.describe('drag-drop / layout components', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('drop between two layout components gets midpoint sort_order', async ({
    page
  }) => {
    const changesetId = await openCartEditor(page);
    const opsBefore = await countOperations(changesetId);

    // The seam right below Breadcrumb (sort 0), right above ShoppingCart
    // (sort 10).
    await dropOnZone(page, {
      widgetLabel: 'Text block',
      widgetCode: 'text_block',
      zoneSelector: `${CONTENT} > [data-evershop-pb-sort-order="0"] + [data-evershop-pb-dropzone]`
    });

    // 10s (vs the usual 5s): the two op POSTs are sequential and the dev
    // server can be mid-rebuild when back-to-back editor sessions run.
    await expect
      .poll(() => countOperations(changesetId), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(opsBefore + 2);

    expect(await lastPlacementSortOrder(changesetId)).toBe(5);
  });

  test('drop after the last layout component appends past it', async ({
    page
  }) => {
    const changesetId = await openCartEditor(page);
    const opsBefore = await countOperations(changesetId);

    // The seam below ShoppingCart — the end of the content area. No next
    // sibling carries a sort order, so the zone computes prev + 1.
    await dropOnZone(page, {
      widgetLabel: 'Text block',
      widgetCode: 'text_block',
      zoneSelector: `${CONTENT} > [data-evershop-pb-sort-order="10"] + [data-evershop-pb-dropzone]`
    });

    // 10s (vs the usual 5s): the two op POSTs are sequential and the dev
    // server can be mid-rebuild when back-to-back editor sessions run.
    await expect
      .poll(() => countOperations(changesetId), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(opsBefore + 2);

    expect(await lastPlacementSortOrder(changesetId)).toBe(11);
  });
});

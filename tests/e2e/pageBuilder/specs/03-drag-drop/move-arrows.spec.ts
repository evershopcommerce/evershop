import { expect, test } from '@playwright/test';
import { getActiveChangesetId } from '../../../shared/changesetDb.js';
import { loadAdminUserId } from '../../../shared/adminMeta.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';
import { EditorPage } from '../../pages/EditorPage.js';
import { PaletteTab } from '../../pages/PaletteTab.js';

/**
 * Layout-aware Move arrows. The chrome's Move up / Move down buttons compute
 * the target sort_order in the iframe (`computeMoveSortOrder` — walks the
 * rendered sibling order, layout components included) and send it in the
 * move message; the admin emits ONE UPDATE op with the value verbatim.
 * Before this, `moveWidget` swapped sort values with the nearest WIDGET
 * sibling only — a widget with no widget siblings had dead arrows, and
 * moves teleported across layout components.
 *
 * Fixture: `cart` (Breadcrumb `sortOrder: 0`, ShoppingCart `sortOrder: 10`,
 * no widgets — same deterministic shape as layout-component-drop.spec.ts).
 * One linear walk covers every landing rule:
 *
 *   drop between them      → widget @ 5   (placement op #1)
 *   Move up                → −1  = 0 − 1  (top of area; 1 op)
 *   Move up again          → no-op        (already first; NO op, no message)
 *   Move down              → 5   = (0+10)/2 (midpoint; 1 op)
 *   Move down              → 11  = 10 + 1 (bottom of area; 1 op)
 *   Move down again        → no-op        (already last; NO op)
 *
 * Exact PLACEMENT-op counts double as the single-op-per-move contract (the
 * legacy swap emitted two). Instance ops are excluded — the drawer's
 * mount-time settings normalization emits one at an unpredictable moment.
 */

const CONTENT = '[data-evershop-area-id="content"]';

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
 * Count PLACEMENT ops only. The settings drawer auto-opens after a drop and
 * its mount-time normalization can emit a `widget_instance` settings UPDATE
 * op at an unpredictable moment — counting all ops races with it. Moves are
 * placement UPDATEs, so this isolates exactly the ops under test (and the
 * one-op-per-move contract stays asserted: each move bumps this by 1).
 */
async function countPlacementOps(changesetId: number): Promise<number> {
  const db = getDb();
  const { rows } = await db.query<{ n: string }>(
    `SELECT COUNT(*) AS n
     FROM changeset_operation
     WHERE changeset_id = $1
       AND entity_urn LIKE 'urn:evershop:cms:widget_placement:%'
       AND new_payload IS NOT NULL`,
    [changesetId]
  );
  return Number(rows[0].n);
}

test.describe('drag-drop / move arrows', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('arrows step over layout components with one UPDATE op per move', async ({
    page
  }) => {
    // One editor session with five toolbar interactions, each gated on a
    // preview round-trip — comfortably more than the default 30s budget on
    // a dev-mode server that may be rebuilding.
    test.setTimeout(120_000);
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
      frame.locator(`${CONTENT} [data-evershop-pb-widget-uid]`)
    ).toHaveCount(0);
    await palette.ensureExpanded();

    // Seed: drop a Banner (renders a visible placeholder when unconfigured — a zero-height widget like an empty text block cannot be hovered for its toolbar) between Breadcrumb(0) and ShoppingCart(10).
    await dropOnZone(page, {
      widgetLabel: 'Banner',
      widgetCode: 'banner',
      zoneSelector: `${CONTENT} > [data-evershop-pb-sort-order="0"] + [data-evershop-pb-dropzone]`
    });
    await expect
      .poll(() => countPlacementOps(changesetId!), { timeout: 10_000 })
      .toBe(1);
    const widget = frame.locator(`${CONTENT} [data-evershop-pb-widget-uid]`);
    await expect(widget).toHaveAttribute(
      'data-evershop-pb-sort-order',
      '5',
      { timeout: 10_000 }
    );

    // The drop auto-opens the settings drawer over the canvas' right edge,
    // exactly where the chrome toolbar sits — it would intercept the arrow
    // clicks. Close it; arrow clicks don't re-select, so it stays closed.
    await page.getByRole('button', { name: 'Close settings' }).click();

    const moveButton = (name: 'Move up' | 'Move down') =>
      widget.getByRole('button', { name });

    // Move up past Breadcrumb → top of area: 0 − 1 = −1. Exactly one op.
    await widget.hover();
    await moveButton('Move up').click();
    await expect
      .poll(() => countPlacementOps(changesetId!), { timeout: 10_000 })
      .toBe(2);
    expect(await lastPlacementSortOrder(changesetId!)).toBe(-1);
    // The preview re-renders with the widget in its new slot — wait for it
    // so the next move computes from the fresh sibling order.
    await expect(widget).toHaveAttribute(
      'data-evershop-pb-sort-order',
      '-1',
      { timeout: 20_000 }
    );

    // Move up again — already first: the iframe computes null and posts
    // nothing. Give the (absent) message a moment, then assert no new op.
    await widget.hover();
    await moveButton('Move up').click();
    await page.waitForTimeout(1_500);
    expect(await countPlacementOps(changesetId!)).toBe(2);

    // Move down past Breadcrumb → midpoint(0, 10) = 5.
    await widget.hover();
    await moveButton('Move down').click();
    await expect
      .poll(() => countPlacementOps(changesetId!), { timeout: 10_000 })
      .toBe(3);
    expect(await lastPlacementSortOrder(changesetId!)).toBe(5);
    await expect(widget).toHaveAttribute('data-evershop-pb-sort-order', '5', {
      timeout: 20_000
    });

    // Move down past ShoppingCart → bottom of area: 10 + 1 = 11.
    await widget.hover();
    await moveButton('Move down').click();
    await expect
      .poll(() => countPlacementOps(changesetId!), { timeout: 10_000 })
      .toBe(4);
    expect(await lastPlacementSortOrder(changesetId!)).toBe(11);
    await expect(widget).toHaveAttribute('data-evershop-pb-sort-order', '11', {
      timeout: 20_000
    });

    // Move down again — already last: no-op, no new op.
    await widget.hover();
    await moveButton('Move down').click();
    await page.waitForTimeout(1_500);
    expect(await countPlacementOps(changesetId!)).toBe(4);
  });
});

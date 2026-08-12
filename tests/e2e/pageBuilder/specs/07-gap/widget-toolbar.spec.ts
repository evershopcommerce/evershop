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

/**
 * WidgetChrome hover toolbar — the per-widget Duplicate / Delete buttons
 * inside the iframe. Settings is covered elsewhere (share-routes / inline-
 * edit specs); here we exercise the destructive + cloning paths.
 *
 *   Duplicate (WidgetChrome.tsx:420):
 *     postMessage('widget-duplicate', { widgetUid, area })
 *       → Editor.duplicateWidget
 *         → INSERT new widget_instance (name = "<original> (copy)")
 *         → INSERT new widget_placement at sortOrder = original + 1
 *
 *   Delete (WidgetChrome.tsx:446):
 *     postMessage('widget-delete', { widgetUid, widgetType })
 *       → Editor.deleteWidget opens ConfirmDialog ("Delete widget?")
 *         → on Confirm: performDeleteWidget walks descendants,
 *           emits DELETE op per widget_instance (old_payload.__delete=true,
 *           new_payload=null)
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

interface WidgetOpRow {
  entity_urn: string;
  old_payload: Record<string, unknown> | null;
  new_payload: Record<string, unknown> | null;
  name: string | null;
}

async function readWidgetOps(
  changesetId: number,
  widgetUuid: string
): Promise<WidgetOpRow[]> {
  const db = getDb();
  const { rows } = await db.query<WidgetOpRow>(
    `SELECT entity_urn, old_payload, new_payload,
            (new_payload->>'name') AS name
     FROM changeset_operation
     WHERE changeset_id = $1
       AND entity_urn = $2
     ORDER BY change_order DESC`,
    [changesetId, `urn:evershop:cms:widget_instance:${widgetUuid}`]
  );
  return rows;
}

async function findCopyOfWidget(
  changesetId: number,
  originalName: string
): Promise<{ uuid: string; name: string } | null> {
  const db = getDb();
  const { rows } = await db.query<{ uuid: string; name: string }>(
    `SELECT (new_payload->>'uuid') AS uuid,
            (new_payload->>'name') AS name
     FROM changeset_operation
     WHERE changeset_id = $1
       AND entity_urn LIKE 'urn:evershop:cms:widget_instance:%'
       AND new_payload->>'name' = $2
     ORDER BY change_order DESC LIMIT 1`,
    [changesetId, `${originalName} (copy)`]
  );
  return rows[0] ?? null;
}

test.describe('widget toolbar / delete + duplicate', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('Duplicate button creates a "<name> (copy)" widget + placement', async ({
    page,
    request
  }) => {
    const editor = new EditorPage(page);
    await editor.open('homepage');
    const changesetId = await getActiveChangesetId(loadAdminUserId());
    expect(changesetId).not.toBeNull();

    const { widgetUuid } = await seedWidgetPlacement(request, {
      changesetId: changesetId!,
      route: 'homepage',
      placementRoute: 'homepage',
      area: 'content',
      widgetType: 'separator'
    });
    await page.reload();
    await expect(page.locator('.page-builder-editor > header')).toBeVisible({
      timeout: 15_000
    });

    const opsBefore = await countOperations(changesetId!);

    const frame = await editor.previewFrame();
    const widgetEl = frame.locator(
      `[data-evershop-pb-widget-uid="${widgetUuid}"]`
    );
    await expect(widgetEl).toBeVisible({ timeout: 10_000 });
    await widgetEl.hover();
    await widgetEl.getByRole('button', { name: 'Duplicate' }).click();

    // Duplicate emits two ops: widget_instance INSERT + widget_placement
    // INSERT. There may also be sort_order bump ops for siblings; assert
    // the inequality, not equality.
    await expect
      .poll(() => countOperations(changesetId!), { timeout: 5_000 })
      .toBeGreaterThanOrEqual(opsBefore + 2);

    // Find the copy. seedWidgetPlacement names widgets `e2e-<type>`, so
    // the copy is `e2e-separator (copy)`.
    const copy = await findCopyOfWidget(changesetId!, 'e2e-separator');
    expect(copy, 'expected a (copy) widget instance').not.toBeNull();
    expect(copy!.uuid).not.toBe(widgetUuid);
  });

  test('Delete + confirm emits a DELETE op for the widget_instance', async ({
    page,
    request
  }) => {
    const editor = new EditorPage(page);
    await editor.open('homepage');
    const changesetId = await getActiveChangesetId(loadAdminUserId());
    expect(changesetId).not.toBeNull();

    const { widgetUuid } = await seedWidgetPlacement(request, {
      changesetId: changesetId!,
      route: 'homepage',
      placementRoute: 'homepage',
      area: 'content',
      widgetType: 'separator'
    });
    await page.reload();
    await expect(page.locator('.page-builder-editor > header')).toBeVisible({
      timeout: 15_000
    });

    const frame = await editor.previewFrame();
    const widgetEl = frame.locator(
      `[data-evershop-pb-widget-uid="${widgetUuid}"]`
    );
    await expect(widgetEl).toBeVisible({ timeout: 10_000 });
    await widgetEl.hover();
    await widgetEl.getByRole('button', { name: 'Delete' }).click();

    // ConfirmDialog opens — title "Delete widget?" (no children, so the
    // non-container copy).
    const confirmDialog = page.getByRole('alertdialog').filter({
      hasText: /Delete widget\?/
    });
    await expect(confirmDialog).toBeVisible({ timeout: 5_000 });
    await confirmDialog.getByRole('button', { name: 'Delete' }).click();

    // A widget_instance DELETE op is identifiable by
    // `new_payload IS NULL AND old_payload->>'__delete' = 'true'`.
    await expect
      .poll(
        async () => {
          const ops = await readWidgetOps(changesetId!, widgetUuid);
          return ops.some(
            (op) =>
              op.new_payload === null &&
              (op.old_payload as Record<string, unknown> | null)?.__delete ===
                true
          );
        },
        { timeout: 5_000 }
      )
      .toBe(true);

    // Iframe widget element should disappear shortly after the op lands
    // (iframe re-renders from the overlay).
    await expect(widgetEl).toHaveCount(0, { timeout: 5_000 });
  });
});

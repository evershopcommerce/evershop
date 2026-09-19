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
 * Inline-edit via `<Editable>` (see `components/common/page-builder/Editable.tsx`).
 *
 * Flow exercised:
 *   contenteditable focus → user types → 250ms input-debounce →
 *   `pb` postMessage('inline-edit') to Editor → `pageForm.setValue` for
 *   that widget → 300ms form-watch debounce → POST widget_instance UPDATE op.
 *
 * Total expected delay from "type" to "DB op": ~550ms. We give the
 * assertion 5s headroom for slow CI.
 *
 * Escape branch: restores the original innerText AND blurs without
 * flushing the in-flight value. We verify no UPDATE op lands.
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

async function readWidgetHeading(
  changesetId: number,
  widgetUuid: string
): Promise<string | null> {
  const db = getDb();
  const { rows } = await db.query<{ heading: string | null }>(
    `SELECT (new_payload->'settings'->>'heading') AS heading
     FROM changeset_operation
     WHERE changeset_id = $1
       AND entity_urn = $2
       AND new_payload IS NOT NULL
     ORDER BY change_order DESC LIMIT 1`,
    [changesetId, `urn:evershop:cms:widget_instance:${widgetUuid}`]
  );
  return rows[0]?.heading ?? null;
}

test.describe('inline edit / Editable', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('typing into Editable + blur posts a widget_instance UPDATE op', async ({
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
      widgetType: 'coupon_block',
      widgetSettings: {
        eyebrow: null,
        heading: 'Original heading',
        body: null,
        code: 'TEST10',
        ctaLabel: 'Shop now',
        ctaLink: '/',
        ctaNewTab: false,
        expires: null,
        borderStyle: 'solid',
        backgroundColor: null
      }
    });

    await page.reload();
    await expect(page.locator('.page-builder-editor > header')).toBeVisible({
      timeout: 15_000
    });

    // Capture op count *before* the edit so we can assert the edit
    // appended an UPDATE op.
    const opsBefore = await countOperations(changesetId!);

    const frame = await editor.previewFrame();
    const headingEditable = frame.locator(
      `[data-evershop-pb-widget-uid="${widgetUuid}"] [data-evershop-editable-field="settings.heading"]`
    );
    await expect(headingEditable).toBeVisible({ timeout: 10_000 });
    await headingEditable.click();
    // Select all then type to replace cleanly. Playwright's `pressSequentially`
    // fires real keystrokes, which the Editable component captures via
    // onInput → debounce → postMessage.
    await page.keyboard.press('ControlOrMeta+A');
    await headingEditable.pressSequentially('Edited heading', { delay: 30 });
    // Blur via Tab — single-line Editable also flushes on Enter, but Tab
    // moves focus out without injecting a newline character into the iframe.
    await page.keyboard.press('Tab');

    // Wait for the UPDATE op to land. The chain: blur → flushSettings →
    // postMessage('inline-edit') → form setValue → 300ms debounce → POST.
    await expect
      .poll(() => countOperations(changesetId!), { timeout: 5_000 })
      .toBeGreaterThan(opsBefore);

    // The latest op's settings.heading reflects what we typed.
    await expect
      .poll(() => readWidgetHeading(changesetId!, widgetUuid), {
        timeout: 5_000
      })
      .toBe('Edited heading');
  });

  test('Escape restores original text and posts no UPDATE op', async ({
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
      widgetType: 'coupon_block',
      widgetSettings: {
        eyebrow: null,
        heading: 'Escape me',
        body: null,
        code: 'TEST20',
        ctaLabel: 'Shop now',
        ctaLink: '/',
        ctaNewTab: false,
        expires: null,
        borderStyle: 'solid',
        backgroundColor: null
      }
    });

    await page.reload();
    await expect(page.locator('.page-builder-editor > header')).toBeVisible({
      timeout: 15_000
    });

    const opsBefore = await countOperations(changesetId!);

    const frame = await editor.previewFrame();
    const headingEditable = frame.locator(
      `[data-evershop-pb-widget-uid="${widgetUuid}"] [data-evershop-editable-field="settings.heading"]`
    );
    await expect(headingEditable).toBeVisible({ timeout: 10_000 });
    await headingEditable.click();
    await page.keyboard.press('ControlOrMeta+A');
    await headingEditable.pressSequentially('Discarded', { delay: 30 });
    // Escape: handler restores innerText to `children` (original) and
    // blurs without calling flushSettings.
    await page.keyboard.press('Escape');

    // Give the inline-edit pipeline a chance to fire (it shouldn't).
    // The full chain is 250ms (input debounce) + 300ms (form debounce).
    // Wait twice that to be confident nothing landed.
    await page.waitForTimeout(1100);

    expect(await countOperations(changesetId!)).toBe(opsBefore);
    // Heading on the latest op for this widget remains the seeded value.
    expect(await readWidgetHeading(changesetId!, widgetUuid)).toBe(
      'Escape me'
    );

    // Visible text in the iframe restored to the original.
    await expect(headingEditable).toHaveText('Escape me');
  });
});

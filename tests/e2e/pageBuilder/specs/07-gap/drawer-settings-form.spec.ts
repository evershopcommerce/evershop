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
import { SettingsDrawer } from '../../pages/SettingsDrawer.js';

/**
 * Schema-driven drawer form — typing into a settings field flows through
 * the same `useWatch` debounce as inline-edit (`Editor.tsx:1567`):
 *
 *   field input → react-hook-form setValue('block.<uid>.settings.X', v)
 *     → useWatch sees `block` change
 *     → 300ms debounce
 *     → saveWidgetSettings → POST widget_instance UPDATE op
 *
 * Total expected delay ~300-400ms. Each per-widget settings file
 * (CouponBlockSetting.tsx, AnnouncementBarSetting.tsx, …) writes to its
 * own slice of `settings.*` via the same form context.
 *
 * Test exercises CouponBlock's "Promo code" input — a plain text field
 * with a stable placeholder "SUMMER20". One field is enough to verify
 * the contract; other widgets' settings forms share the wiring.
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

async function readWidgetCode(
  changesetId: number,
  widgetUuid: string
): Promise<string | null> {
  const db = getDb();
  const { rows } = await db.query<{ code: string | null }>(
    `SELECT (new_payload->'settings'->>'code') AS code
     FROM changeset_operation
     WHERE changeset_id = $1
       AND entity_urn = $2
       AND new_payload IS NOT NULL
     ORDER BY change_order DESC LIMIT 1`,
    [changesetId, `urn:evershop:cms:widget_instance:${widgetUuid}`]
  );
  return rows[0]?.code ?? null;
}

test.describe('drawer / settings form', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('typing in drawer Promo code field posts a widget_instance UPDATE', async ({
    page,
    request
  }) => {
    const editor = new EditorPage(page);
    const drawer = new SettingsDrawer(page);
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
        heading: 'Promo headline',
        body: null,
        code: 'ORIGINAL',
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

    // Open drawer by clicking the widget's Settings gear in the iframe
    // toolbar. (See share-routes spec for the same pattern.)
    const frame = await editor.previewFrame();
    const widgetEl = frame.locator(
      `[data-evershop-pb-widget-uid="${widgetUuid}"]`
    );
    await expect(widgetEl).toBeVisible({ timeout: 10_000 });
    await widgetEl.hover();
    await widgetEl.getByRole('button', { name: 'Settings' }).click();
    await expect(drawer.drawer).toBeVisible();

    const opsBefore = await countOperations(changesetId!);

    // The Field label isn't bound to its input via htmlFor — anchor on
    // the placeholder text "SUMMER20" set in CouponBlockSetting.tsx,
    // which is uniquely identifying within the drawer.
    const codeInput = drawer.drawer.getByPlaceholder('SUMMER20');
    await expect(codeInput).toBeVisible();
    await codeInput.fill('E2EEDIT');

    // The useWatch debounce is 300ms — give it 5s of headroom for CI.
    await expect
      .poll(() => countOperations(changesetId!), { timeout: 5_000 })
      .toBeGreaterThan(opsBefore);
    await expect
      .poll(() => readWidgetCode(changesetId!, widgetUuid), { timeout: 5_000 })
      .toBe('E2EEDIT');
  });
});

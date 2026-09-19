import { expect, test } from '@playwright/test';
import { getActiveChangesetId } from '../../../shared/changesetDb.js';
import { loadAdminUserId } from '../../../shared/adminMeta.js';
import { discardAdminChangesets, getDb } from '../../../shared/db.js';
import { PaletteTab } from '../../pages/PaletteTab.js';

/**
 * The SessionPicker is an ENTRY dialog — its show/skip decision must be
 * made once per mount, not re-evaluated live. The regression: entering
 * with a fresh empty draft auto-skipped the picker but never acknowledged
 * the session, and the render condition watched the live
 * `operations.length` (refetched after every op for the exit-safety
 * gates) — so the user's very FIRST edit popped "Start a page-builder
 * session" over their work. Publish reproduces it reliably: it reloads
 * into a freshly-minted draft (new changesetId → no ack key), then the
 * next change summons the dialog.
 *
 * This spec navigates WITHOUT EditorPage.open()'s picker suppression —
 * the picker's real behavior is the subject under test.
 *
 * Also locks the counter-case: the auto-skip acknowledgment is per-tab
 * (sessionStorage), so a different tab entering the same now-non-empty
 * draft still gets the entry picker.
 */

const CONTENT = '[data-evershop-area-id="content"]';
const TOPBAR = '.page-builder-editor > header';
const IFRAME = '.page-builder-editor iframe';

function pickerDialog(page: import('@playwright/test').Page) {
  return page.getByRole('dialog', { name: 'Start a page-builder session' });
}

/** Navigate to the editor with NO picker suppression and wait for paint. */
async function openEditorRaw(
  page: import('@playwright/test').Page,
  routeId: string
): Promise<void> {
  await page.goto(`/admin/page-builder/edit/${routeId}`);
  await expect(page.locator(TOPBAR)).toBeVisible({ timeout: 15_000 });
  await expect(
    page.frameLocator(IFRAME).locator('header').first()
  ).toBeVisible({ timeout: 20_000 });
}

async function dropTextBlock(
  page: import('@playwright/test').Page
): Promise<void> {
  await page.evaluate(() => {
    const cards = Array.from(
      document.querySelectorAll(
        '.page-builder-editor aside button[draggable="true"]'
      )
    ) as HTMLButtonElement[];
    const card = cards.find((c) =>
      (c.textContent || '').trim().startsWith('Text block')
    );
    if (!card) throw new Error('Text block card not found.');
    const iframe = document.querySelector(
      '.page-builder-editor iframe'
    ) as HTMLIFrameElement | null;
    if (!iframe?.contentDocument) throw new Error('Editor iframe missing.');
    const zone = iframe.contentDocument.querySelector(
      '[data-evershop-area-id="content"] > [data-evershop-pb-dropzone]'
    ) as HTMLElement | null;
    if (!zone) throw new Error('No drop zone found in content.');
    const dt = new DataTransfer();
    dt.setData('application/x-evershop-widget', 'text_block');
    dt.setData('text/plain', 'text_block');
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
  });
}

async function countOps(changesetId: number): Promise<number> {
  const db = getDb();
  const { rows } = await db.query<{ n: string }>(
    `SELECT COUNT(*) AS n FROM changeset_operation WHERE changeset_id = $1`,
    [changesetId]
  );
  return Number(rows[0].n);
}

test.describe('publish / session picker', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('first edit on a fresh draft does not summon the entry picker', async ({
    page
  }) => {
    test.setTimeout(120_000);

    // Entry with a freshly-minted empty draft: picker auto-skips.
    await openEditorRaw(page, 'cart');
    await expect(pickerDialog(page)).toHaveCount(0);

    // Make the first edit (the reported repro: any change right after the
    // post-publish reload — beforeEach's discard produces the same fresh
    // draft the publish reload does).
    const palette = new PaletteTab(page);
    await palette.ensureExpanded();
    await dropTextBlock(page);
    const changesetId = await getActiveChangesetId(loadAdminUserId());
    expect(changesetId).not.toBeNull();
    await expect
      .poll(() => countOps(changesetId!), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(2);

    // The op refetch has now bumped operations.length in the editor. The
    // entry dialog must NOT appear over the user's work.
    await page.waitForTimeout(2_500);
    await expect(pickerDialog(page)).toHaveCount(0);

    // Same tab reload mid-work: this tab already owns the session — the
    // picker must not re-ask.
    await page.reload();
    await expect(page.locator(TOPBAR)).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2_500);
    await expect(pickerDialog(page)).toHaveCount(0);

    // Counter-case: a DIFFERENT tab (fresh sessionStorage) entering the
    // same, now non-empty draft gets the entry picker as designed.
    const page2 = await page.context().newPage();
    try {
      await page2.goto('/admin/page-builder/edit/cart');
      await expect(page2.locator(TOPBAR)).toBeVisible({ timeout: 20_000 });
      await expect(pickerDialog(page2)).toBeVisible({ timeout: 15_000 });
      await expect(
        page2.getByRole('button', { name: /Continue your draft/i })
      ).toBeVisible();
    } finally {
      await page2.close();
    }
  });
});

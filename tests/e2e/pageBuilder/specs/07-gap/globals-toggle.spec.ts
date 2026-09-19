import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discardAdminChangesets } from '../../../shared/db.js';
import { EditorPage } from '../../pages/EditorPage.js';

/**
 * Globals view toggle.
 *
 * Pipeline (see `Editor.tsx:355` + `PageBuilderBridge.tsx`):
 *   Editor: useState(globalsView=false) → on click, postMessage to iframe
 *           `{ type: 'globals-view', enabled }`
 *   Iframe: PageBuilderBridge listens, sets/unsets
 *           `body[data-evershop-globals-view="1"]`
 *   CSS rule then highlights every `<Area isGlobal>` (which carry
 *   `data-evershop-global="true"`).
 *
 * We assert against the body attribute — that's the visual contract; the
 * CSS rule that paints the highlight key off it.
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

test.describe('globals toggle', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('Globals button toggles the iframe body attribute', async ({ page }) => {
    const editor = new EditorPage(page);
    await editor.open('homepage');
    const frame = await editor.previewFrame();
    const body = frame.locator('body');

    // Default off — attribute absent (Editor seeds `globalsView=false`).
    await expect(body).not.toHaveAttribute('data-evershop-globals-view', '1');

    // Click on → attribute === "1".
    await editor.globalsToggle.click();
    await expect(body).toHaveAttribute('data-evershop-globals-view', '1');

    // Click off → attribute cleared. PageBuilderBridge removes the
    // attribute outright when enabled=false (rather than setting "0"),
    // so the assertion is "no attribute" rather than "= 0".
    await editor.globalsToggle.click();
    await expect(body).not.toHaveAttribute('data-evershop-globals-view', '1');
  });
});

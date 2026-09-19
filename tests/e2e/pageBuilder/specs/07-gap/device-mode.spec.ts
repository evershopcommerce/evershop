import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discardAdminChangesets } from '../../../shared/db.js';
import { EditorPage } from '../../pages/EditorPage.js';

/**
 * Device-mode toggle resizes the iframe's wrapper. The wrapper carries
 * `style.maxWidth` driven by the `DEVICE_WIDTHS` map in
 * `Editor.tsx`:
 *
 *   desktop → no maxWidth (falls back to 100%)
 *   tablet  → 768px
 *   phone   → 375px
 *
 * Test asserts the wrapper element's inline max-width style changes
 * when the corresponding button is clicked.
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

test.describe('device mode', () => {
  test.beforeEach(async () => {
    await discardAdminChangesets(loadAdminUserId());
  });

  test('tablet/phone/desktop buttons resize the iframe wrapper', async ({
    page
  }) => {
    const editor = new EditorPage(page);
    await editor.open('homepage');

    // Wrapper element: the div immediately containing the iframe.
    const wrapper = page.locator('.page-builder-editor iframe').locator('..');
    // DeviceButton's accessible name is the aria-label `Show <Label> width`,
    // not the visible icon. Anchor on that.
    const tabletBtn = editor.topbar.getByRole('button', {
      name: 'Show Tablet width'
    });
    const phoneBtn = editor.topbar.getByRole('button', {
      name: 'Show Phone width'
    });
    const desktopBtn = editor.topbar.getByRole('button', {
      name: 'Show Desktop width'
    });

    // Desktop is the default; wrapper has no inline max-width set.
    await expect(wrapper).toHaveCSS('max-width', '100%');

    await tabletBtn.click();
    await expect(wrapper).toHaveCSS('max-width', '768px');

    await phoneBtn.click();
    await expect(wrapper).toHaveCSS('max-width', '375px');

    await desktopBtn.click();
    await expect(wrapper).toHaveCSS('max-width', '100%');
  });
});

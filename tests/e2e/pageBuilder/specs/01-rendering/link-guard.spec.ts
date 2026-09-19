import { expect, test } from '@playwright/test';
import { EditorPage } from '../../pages/EditorPage.js';

/**
 * Preview link guard.
 *
 * The page-builder session lives in the preview iframe's URL
 * (`?changeset=<token>`). Before the guard, clicking any `<a href>` inside
 * the preview — menu links, banner CTAs, or editable text nested inside a
 * linked tile — navigated the iframe to the link target, dropping the
 * token and silently deactivating every edit affordance: the admin shell
 * kept running against a dead preview ("kicked out but still inside").
 *
 * `PageBuilderBridge` now installs a capture-phase click/auxclick listener
 * that `preventDefault()`s all anchor activations while edit mode is on.
 *
 * Test strategy — two latency-independent signals (the dev server can take
 * seconds to render a storefront page, so "did the URL change after a
 * fixed wait" races a slow in-flight navigation and passes vacuously):
 *   1. A synthetic cancelable click on a real link must come back
 *      `defaultPrevented` — proves the guard listener is registered.
 *   2. A trusted click must not ISSUE a document request from the preview
 *      frame. Navigation requests are issued immediately on nav start
 *      regardless of server latency, so a short window suffices.
 */
test.describe('editor / preview link guard', () => {
  test('clicking a link inside the preview does not navigate the iframe', async ({
    page
  }) => {
    const editor = new EditorPage(page);
    await editor.open('homepage');

    const previewFrame = page
      .frames()
      .find((f) => f.url().includes('changeset='));
    expect(previewFrame, 'preview iframe should carry ?changeset=').toBeTruthy();
    const urlBefore = previewFrame!.url();

    // Signal 1: the capture-phase guard cancels a synthetic anchor click.
    const prevented = await previewFrame!.evaluate(() => {
      const link = document.querySelector('a[href]');
      if (!link) return 'no-link';
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(ev);
      return ev.defaultPrevented;
    });
    expect(prevented, 'guard must preventDefault anchor clicks').toBe(true);

    // Signal 2: a trusted click on a visible link issues no document
    // request from the preview frame (i.e., no navigation even starts).
    const docRequests: string[] = [];
    page.on('request', (r) => {
      if (r.resourceType() === 'document' && r.frame() === previewFrame) {
        docRequests.push(r.url());
      }
    });
    const link = (await editor.previewFrame())
      .locator('a[href]:visible')
      .first();
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForTimeout(1500);

    expect(
      docRequests,
      'no navigation may start from the preview frame'
    ).toEqual([]);
    expect(previewFrame!.url()).toBe(urlBefore);

    // Edit mode is still on and the admin shell never navigated.
    expect(
      await previewFrame!.evaluate(
        () =>
          (window as unknown as { __EVERSHOP_PAGE_BUILDER__?: { active: true } })
            .__EVERSHOP_PAGE_BUILDER__?.active === true
      )
    ).toBe(true);
    expect(page.url()).toContain('/admin/page-builder/edit/homepage');
  });
});

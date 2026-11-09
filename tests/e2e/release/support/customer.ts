// Helpers for the storefront customer specs.
import {
  expect,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page
} from '@playwright/test';
import type { CapturedMail } from './mail';

/** The POSTs the store's `auth` rate limit counts (modules/base/services/rateLimit.ts). */
export const AUTH_POST_PATHS = new Set([
  '/customer/login',
  '/admin/user/login',
  '/api/customers',
  '/api/customers/reset-password',
  '/api/customers/password'
]);

export interface AuthPostCounter {
  readonly count: number;
  readonly paths: string[];
}

/** Counts the rate-limited auth POSTs every page of `context` sends, so a
 *  test can prove it stays inside its share of the store's 8 per 15 minutes. */
export function countAuthPosts(context: BrowserContext): AuthPostCounter {
  const paths: string[] = [];
  context.on('request', (req) => {
    if (req.method() !== 'POST') return;
    const { pathname } = new URL(req.url());
    if (AUTH_POST_PATHS.has(pathname)) paths.push(pathname);
  });
  return {
    get count() {
      return paths.length;
    },
    paths
  };
}

/** Waits until React has hydrated the element (its props are attached), so a
 *  click reaches its handler. A click before that does nothing on a
 *  `type="button"` button or a dialog trigger, and retrying the click instead
 *  could send a rate-limited POST twice. */
export async function hydrated(locator: Locator): Promise<Locator> {
  await expect(locator).toBeVisible();
  await expect
    .poll(
      () =>
        locator.evaluate((el) =>
          Object.keys(el).some((k) => k.startsWith('__reactProps$'))
        ),
      {
        message: 'the page hydrated'
      }
    )
    .toBe(true);
  return locator;
}

/** Picks an option of a base-ui select. */
export async function chooseOption(
  page: Page,
  combobox: Locator,
  name: string
): Promise<void> {
  await expect(combobox).toBeEnabled();
  await combobox.click();
  await page.getByRole('option', { name, exact: true }).click();
  await expect(combobox).toContainText(name);
}

/** The target of a link in an email, as a mail client shows it: the HTML is
 *  rendered (so `&#x3D;` and the like are decoded) in its own context, without
 *  JavaScript or network, which the test's error watch does not see. */
export async function linkInMail(
  browser: Browser,
  mail: CapturedMail,
  name: string | RegExp
): Promise<string> {
  const ctx = await browser.newContext({
    javaScriptEnabled: false,
    offline: true
  });
  try {
    const view = await ctx.newPage();
    await view.setContent(mail.body, { waitUntil: 'domcontentloaded' });
    const href = await view.getByRole('link', { name }).getAttribute('href');
    if (!href)
      throw new Error(`no link "${name}" in the email "${mail.subject}"`);
    return href;
  } finally {
    await ctx.close();
  }
}

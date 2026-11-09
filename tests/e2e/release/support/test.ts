// The `test` every release spec uses. On top of Playwright's:
//   - fails the test on a browser console error, an uncaught page error or a
//     5xx answer from the store, unless the test allows that message. Only
//     the store's own code counts: messages logged by a payment provider's
//     page or frame (PayPal, Stripe's 3-D Secure test page) are theirs;
//   - `adminPage`: a page signed in to the admin (state saved by admin.setup.ts).
import { test as base, expect, type Page } from '@playwright/test';
import { adminStateFile, releaseStore, type ReleaseStore } from './store';

interface Fixtures {
  /** Console messages this test expects (for example a 401 on a wrong password). */
  allowedErrors: RegExp[];
  watchErrors: void;
  store: ReleaseStore;
  adminPage: Page;
}

export const test = base.extend<Fixtures>({
  allowedErrors: [[], { option: true }],
  store: async ({}, use) => {
    await use(releaseStore());
  },
  watchErrors: [
    async ({ page, context, allowedErrors }, use, testInfo) => {
      const problems: string[] = [];
      const origin = new URL(releaseStore().baseUrl).origin;
      // A message is the store's when its script (or, without one, the page
      // that logged it) is on the store's origin.
      const ours = (url: string) => !url || url.startsWith(origin);
      const watch = (p: Page) => {
        p.on('console', (msg) => {
          if (
            msg.type() === 'error' &&
            ours(msg.location().url || p.url()) &&
            !allowedErrors.some((r) => r.test(msg.text()))
          ) {
            problems.push(`console error on ${p.url()}: ${msg.text()}`);
          }
        });
        p.on('pageerror', (err) => {
          if (
            ours(p.url()) &&
            !allowedErrors.some((r) => r.test(err.message))
          )
            problems.push(`page error on ${p.url()}: ${err.message}`);
        });
        p.on('response', (res) => {
          if (
            res.status() >= 500 &&
            res.url().startsWith(origin) &&
            !allowedErrors.some((r) => r.test(res.url()))
          ) {
            problems.push(`HTTP ${res.status()} from ${res.url()}`);
          }
        });
      };
      watch(page);
      context.on('page', watch);
      await use();
      if (problems.length) {
        await testInfo.attach('errors', {
          body: problems.join('\n'),
          contentType: 'text/plain'
        });
      }
      expect(problems, 'browser errors or 5xx answers during the test').toEqual(
        []
      );
    },
    { auto: true }
  ],
  adminPage: async ({ browser, allowedErrors }, use) => {
    const ctx = await browser.newContext({
      storageState: adminStateFile(),
      baseURL: releaseStore().baseUrl
    });
    const page = await ctx.newPage();
    const problems: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        !allowedErrors.some((r) => r.test(msg.text()))
      )
        problems.push(`console error on ${page.url()}: ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      if (!allowedErrors.some((r) => r.test(err.message)))
        problems.push(`page error on ${page.url()}: ${err.message}`);
    });
    page.on('response', (res) => {
      if (res.status() >= 500 && !allowedErrors.some((r) => r.test(res.url())))
        problems.push(`HTTP ${res.status()} from ${res.url()}`);
    });
    await use(page);
    await ctx.close();
    expect(
      problems,
      'admin browser errors or 5xx answers during the test'
    ).toEqual([]);
  }
});

export { expect };

/**
 * The value for `test.use({ allowedErrors })` from one or more patterns.
 * Always use it: Playwright reads a fixture value `[a, b]` whose second item
 * is an object (a RegExp is one) as `[value, fixtureOptions]`, so a plain
 * `allowedErrors: [re1, re2]` breaks with "allowedErrors.some is not a
 * function". This merges the patterns into one RegExp.
 */
export function allowed(...patterns: RegExp[]): RegExp[] {
  return [new RegExp(patterns.map((p) => `(?:${p.source})`).join('|'))];
}

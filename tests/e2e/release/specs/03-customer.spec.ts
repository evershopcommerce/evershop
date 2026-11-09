// R-CUS: the customer account through the storefront UI. The file registers
// one customer and the tests share it, so they run in order (serial). The
// customer is found by its unique email everywhere, so the tests pass on an
// empty fresh store and on an upgraded store that already has customers.
//
// Login budget. The store allows 8 auth POSTs per 15 minutes per IP
// (modules/base/services/rateLimit.ts). The harness runs each spec file in
// its own pass after restarting the store, so this file has the 8 to itself
// minus the admin setup's 1 (when the saved session expired): it may use 7.
// Each test asserts its share.
//   R-CUS-01  2  POST /api/customers, then the form's own POST /customer/login
//   R-CUS-05  2  POST /api/customers/reset-password, POST /api/customers/password
//   R-CUS-04  1  POST /customer/login with the old (wrong) password
//   R-CUS-03  1  POST /customer/login (the new password, the email in capitals)
//   total     6
// Signing up through the form costs 2 (it signs in with a second POST).
//
// Run order: 01 register, 02 sign out, 05 reset the password, 04 the old
// password is refused, 03 sign in with the new one, 06 address book, 07 admin.
import type { Cookie, Page } from '@playwright/test';
import {
  chooseOption,
  countAuthPosts,
  hydrated,
  linkInMail
} from '../support/customer';
import { waitForMail } from '../support/mail';
import { unique } from '../support/store';
import { expect, test } from '../support/test';

/** R-CUS-04 spends a 6th auth POST; this file runs in its own pass, so there is room. */
const WRONG_PASSWORD_IN_BUDGET = true;

const customer = {
  fullName: `Rita ${unique('Release')}`,
  email: `${unique('customer')}@release-check.test`,
  password: 'first-Pass-2026',
  newPassword: 'second-Pass-2026'
};

/** The signed-in session, handed from the test that signs in to the next ones. */
let session: Cookie[] = [];

const header = (page: Page) => page.getByRole('banner');
const accountPageHeading = (page: Page) =>
  page.getByRole('heading', { name: 'My account', level: 1 });
const signInHeading = (page: Page) =>
  page.getByRole('heading', { name: 'Sign in', level: 1 });

async function expectSignedIn(page: Page): Promise<void> {
  await expect(
    header(page).getByRole('link', { name: 'Account', exact: true })
  ).toBeVisible();
  await page.goto('/account');
  await expect(page).toHaveURL(/\/account$/);
  await expect(accountPageHeading(page)).toBeVisible();
  const info = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Account information' })
  });
  await expect(info).toContainText(customer.fullName);
  await expect(info).toContainText(customer.email);
}

async function expectSignedOut(page: Page): Promise<void> {
  await expect(
    header(page).getByRole('link', { name: 'Sign in', exact: true })
  ).toBeVisible();
  await page.goto('/account');
  await expect(page).toHaveURL(/\/account\/login$/);
  await expect(signInHeading(page)).toBeVisible();
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe.serial('Customer account', () => {
  test('R-CUS-01 A visitor registers with full name, email and password, is signed in, and gets the welcome email', async ({
    page
  }) => {
    const auth = countAuthPosts(page.context());
    await page.goto('/account/register');
    const signUp = await hydrated(
      page.getByRole('button', { name: 'Sign Up' })
    );
    await page
      .getByRole('textbox', { name: /^Full Name/ })
      .fill(customer.fullName);
    await page.getByRole('textbox', { name: /^Email/ }).fill(customer.email);
    await page
      .getByRole('textbox', { name: /^Password/ })
      .fill(customer.password);
    await signUp.click();
    await page.waitForURL((u) => u.pathname === '/');
    await expectSignedIn(page);

    const mail = await waitForMail(customer.email, /^Welcome to our store!$/);
    expect(
      mail.body,
      'the welcome email greets the customer by name'
    ).toContain(customer.fullName);

    session = await page.context().cookies();
    expect(
      auth.count,
      `auth POSTs: ${auth.paths.join(', ')}`
    ).toBeLessThanOrEqual(2);
  });

  test('R-CUS-02 The customer signs out, and the account page then asks to sign in', async ({
    page
  }) => {
    await page.context().addCookies(session);
    await page.goto('/account');
    await expect(accountPageHeading(page)).toBeVisible();
    await (
      await hydrated(page.getByRole('button', { name: 'Log out' }))
    ).click();
    await page.waitForURL((u) => u.pathname === '/');
    await expectSignedOut(page);

    // The store ended the session itself: the cookie from before the sign-out
    // no longer opens the account.
    await page.context().clearCookies();
    await page.context().addCookies(session);
    await page.goto('/account');
    await expect(page).toHaveURL(/\/account\/login$/);
  });

  test('R-CUS-05 Forgot password: the reset email arrives, its link opens the reset page, and a new password is set', async ({
    page,
    browser,
    store
  }) => {
    const auth = countAuthPosts(page.context());
    await page.goto('/account/login');
    await page.getByRole('link', { name: 'Forgot your password?' }).click();
    await expect(page).toHaveURL(/\/account\/reset-password$/);
    const send = await hydrated(
      page.getByRole('button', { name: 'Reset Password' })
    );
    await page.getByRole('textbox', { name: /^Email/ }).fill(customer.email);
    await send.click();
    await expect(
      page.getByText(
        'We have sent you an email with a link to reset your password.'
      )
    ).toBeVisible();

    const mail = await waitForMail(customer.email, /^Reset your password$/);
    const link = await linkInMail(browser, mail, 'Reset password');
    expect(link, 'the email links to this store').toMatch(
      new RegExp(
        `^${escapeRegExp(
          store.baseUrl
        )}/account/reset-password\\?token=[\\w-]+$`
      )
    );

    await page.goto(link);
    await expect(
      page.getByRole('heading', { name: 'Enter your new password' })
    ).toBeVisible();
    const update = await hydrated(
      page.getByRole('button', { name: 'UPDATE PASSWORD' })
    );
    await page
      .getByRole('textbox', { name: 'Password' })
      .fill(customer.newPassword);
    await update.click();
    await expect(
      page.getByText('Your password has been updated successfully.')
    ).toBeVisible();
    await page.getByRole('button', { name: 'Go to Login' }).click();
    await expect(page).toHaveURL(/\/account\/login$/);
    await expect(signInHeading(page)).toBeVisible();

    expect(
      auth.count,
      `auth POSTs: ${auth.paths.join(', ')}`
    ).toBeLessThanOrEqual(2);
  });

  test.describe('R-CUS-04', () => {
    // The refused sign-in answers 4xx, which Chrome logs as a console error.
    test.use({
      allowedErrors: [
        /Failed to load resource: the server responded with a status of 4\d\d/
      ]
    });

    test('R-CUS-04 A wrong password (the one the reset replaced) is refused with a visible error and does not sign in', async ({
      page
    }) => {
      test.skip(
        !WRONG_PASSWORD_IN_BUDGET,
        'needs a 6th login POST in this file; the suite gives it 5 (see the budget at the top of 03-customer.spec.ts)'
      );
      const auth = countAuthPosts(page.context());
      await page.goto('/account/login');
      const signIn = await hydrated(
        page.getByRole('button', { name: 'Sign In' })
      );
      await page.getByRole('textbox', { name: /^Email/ }).fill(customer.email);
      await page
        .getByRole('textbox', { name: /^Password/ })
        .fill(customer.password);
      const [answer] = await Promise.all([
        page.waitForResponse(
          (r) =>
            new URL(r.url()).pathname === '/customer/login' &&
            r.request().method() === 'POST'
        ),
        signIn.click()
      ]);
      expect(
        answer.status(),
        'a refused sign-in is a client error'
      ).toBeGreaterThanOrEqual(400);
      expect(answer.status()).toBeLessThan(500);
      await expect(page.getByText('Invalid email or password')).toBeVisible();
      await expect(page).toHaveURL(/\/account\/login$/);
      await expectSignedOut(page);

      expect(
        auth.count,
        `auth POSTs: ${auth.paths.join(', ')}`
      ).toBeLessThanOrEqual(1);
    });
  });

  test('R-CUS-03 The customer signs in again with email (typed in capitals) and password, the new one from R-CUS-05', async ({
    page
  }) => {
    const auth = countAuthPosts(page.context());
    await page.goto('/account/login');
    const signIn = await hydrated(
      page.getByRole('button', { name: 'Sign In' })
    );
    await page
      .getByRole('textbox', { name: /^Email/ })
      .fill(customer.email.toUpperCase());
    await page
      .getByRole('textbox', { name: /^Password/ })
      .fill(customer.newPassword);
    await signIn.click();
    await page.waitForURL((u) => u.pathname === '/');
    await expectSignedIn(page);

    session = await page.context().cookies();
    expect(
      auth.count,
      `auth POSTs: ${auth.paths.join(', ')}`
    ).toBeLessThanOrEqual(1);
  });

  test('R-CUS-06 The customer adds a US address in the address book, edits it, and the change shows', async ({
    page
  }) => {
    await page.context().addCookies(session);
    await page.goto('/account');
    const book = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Address book' }) });
    await expect(book).toContainText('You have no addresses saved');

    await (
      await hydrated(book.getByRole('button', { name: 'Add new address' }))
    ).click();
    const add = page.getByRole('dialog', { name: 'Add new address' });
    await chooseOption(
      page,
      add.getByRole('combobox', { name: /^Country/ }),
      'United States'
    );
    // The form follows the country: the US needs a state and a ZIP code.
    const zip = add.getByRole('textbox', { name: /^ZIP code/ });
    await expect(zip).toBeVisible();
    await add
      .getByRole('textbox', { name: /^Full name/ })
      .fill(customer.fullName);
    await add.getByRole('textbox', { name: /^Telephone/ }).fill('4155550100');
    await add
      .getByRole('textbox', { name: /^Address(\s*\*)?$/ })
      .fill('1 Market St');
    await add.getByRole('textbox', { name: /^City/ }).fill('San Francisco');
    await chooseOption(
      page,
      add.getByRole('combobox', { name: /^State/ }),
      'California'
    );
    await zip.fill('94105');
    await add.getByRole('button', { name: 'Save' }).click();
    await expect(add).toBeHidden();
    await expect(
      page.getByText('Address has been saved successfully!')
    ).toBeVisible();
    await expect(book).toContainText('1 Market St');
    await expect(book).toContainText('San Francisco, California 94105');
    await expect(book).toContainText('United States');

    await (await hydrated(book.getByRole('button', { name: 'Edit' }))).click();
    const edit = page.getByRole('dialog', { name: 'Edit Address' });
    const city = edit.getByRole('textbox', { name: /^City/ });
    await expect(
      city,
      'the edit form opens with the saved address'
    ).toHaveValue('San Francisco');
    await expect(
      edit.getByRole('combobox', { name: /^Country/ })
    ).toContainText('United States');
    await expect(edit.getByRole('combobox', { name: /^State/ })).toContainText(
      'California'
    );
    await city.fill('Oakland');
    await edit.getByRole('textbox', { name: /^ZIP code/ }).fill('94607');
    await edit.getByRole('button', { name: 'Save' }).click();
    await expect(edit).toBeHidden();
    await expect(
      page.getByText('Address has been updated successfully!')
    ).toBeVisible();

    // Saved by the store, not only shown: the same after a reload.
    await page.reload();
    await expect(book).toContainText('Oakland, California 94607');
    await expect(book).not.toContainText('San Francisco');
    await expect(
      book.getByRole('button', { name: 'Edit' }),
      'the edit did not add a second address'
    ).toHaveCount(1);
  });

  test('R-CUS-07 The admin sees the new customer in Admin → Customers', async ({
    adminPage
  }) => {
    await adminPage.goto('/admin/customers');
    const search = await hydrated(
      adminPage.locator('form#customerGridFilter').getByPlaceholder('Search')
    );
    await search.fill(customer.email);
    await search.press('Enter');
    await adminPage.waitForURL(/[?&]keyword=/);
    const row = adminPage.getByRole('row').filter({ hasText: customer.email });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(customer.fullName);
    await expect(row).toContainText('Active');

    await row.getByRole('link', { name: customer.fullName }).click();
    await expect(
      adminPage.getByRole('heading', { name: `Editing ${customer.fullName}` })
    ).toBeVisible();
    await expect(
      adminPage.getByText(customer.email, { exact: true })
    ).toBeVisible();
  });
});

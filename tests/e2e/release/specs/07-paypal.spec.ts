// R-PPL: PayPal against the sandbox. The shopper is sent to
// www.sandbox.paypal.com, signs in as the sandbox buyer and approves; PayPal
// sends them back to the store's return page, which finalizes the payment in
// the store's own process (no webhook needed: PayPal cannot reach localhost,
// so the PayPal webhook is not covered here).
//
// Needs PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET (a sandbox REST app) and
// PAYPAL_BUYER_EMAIL, PAYPAL_BUYER_PASSWORD (its sandbox personal account) in
// tests/e2e/.env.release; skipped without them.
//
// No store login / registration POST (guest checkouts only). Each payment
// signs in to the PayPal sandbox once.
import type { Page } from '@playwright/test';
import {
  checkoutWorld,
  placeCodOrder,
  re,
  withAdminApi,
  type CheckoutWorld
} from '../support/checkout';
import {
  expectSuccessPage,
  guestReadyToPay,
  placeOrder
} from '../support/checkoutUi';
import { KNOWN_BUGS } from '../support/knownBugs';
import { allMail, waitForMail } from '../support/mail';
import {
  adminCapture,
  adminRefundAll,
  enablePaypal,
  PAYPAL_NAME,
  paypalAccount,
  waitForPaymentStatus,
  type PaypalIntent
} from '../support/payments';
import { unique } from '../support/store';
import { allowed, expect, test } from '../support/test';

const account = paypalAccount();
test.skip(!account, 'No PayPal sandbox account in tests/e2e/.env.release');

// The admin order page of a cancelable order fails hydration with React #418
// (CancelButton.tsx nests a <button> in a <button>, KNOWN_BUGS).
test.use({
  allowedErrors: allowed(KNOWN_BUGS.nestedButtonHydration.message)
});

let world: CheckoutWorld;

test.beforeAll(async () => {
  world = await withAdminApi(async (api) => {
    const w = await checkoutWorld(api);
    await enablePaypal(api, 'CAPTURE');
    return w;
  });
  // PayPal gets the order number as invoice_id and the sandbox refuses a
  // repeated one. run.mjs moves the store's order ids to a range of its own,
  // but the next order number still follows the newest existing order: this
  // COD order takes it, so the PayPal orders get numbers no store had before.
  await placeCodOrder(world, [{ product: world.product, qty: 1 }]);
});

async function setIntent(intent: PaypalIntent) {
  await withAdminApi((api) => enablePaypal(api, intent));
}

/** A guest chooses PayPal and is sent to the PayPal sandbox. */
async function goToPaypal(page: Page) {
  const email = `${unique('paypal')}@release-check.test`;
  await guestReadyToPay(page, world, email);
  const method = page.getByRole('radio', { name: re(PAYPAL_NAME) });
  await method.click();
  await expect(method).toBeChecked();
  await expect(
    page.getByText('You will be redirected to PayPal for payment processing.')
  ).toBeVisible();
  const order = await placeOrder(
    page,
    page.getByRole('button', { name: 'Pay with PayPal' })
  );
  await page.waitForURL(/^https:\/\/www\.sandbox\.paypal\.com\//, {
    timeout: 45_000
  });
  return { ...order, email };
}

/** On the PayPal page: sign in as the sandbox buyer and approve. PayPal's
 *  page follows the browser's country (its text may not be English), so this
 *  goes by element ids. */
async function approveOnPaypal(page: Page) {
  const email = page.locator('#email');
  await email.waitFor({ state: 'visible', timeout: 30_000 });
  await email.fill(account!.buyerEmail);
  // One page or two: the password field may already be there.
  const password = page.locator('#password');
  if (!(await password.isVisible())) await page.locator('#btnNext').click();
  await password.waitFor({ state: 'visible', timeout: 30_000 });
  await password.fill(account!.buyerPassword);
  await page.locator('#btnLogin').click();
  const pay = page.locator(
    '[data-testid="submit-button-initial"], #payment-submit-btn'
  );
  await pay.first().waitFor({ state: 'visible', timeout: 45_000 });
  await pay.first().click();
}

test('R-PPL-01 The admin turns PayPal on in the payment settings (sandbox); the checkout offers it', async ({
  adminPage,
  page
}) => {
  await adminPage.goto('/admin/setting/payments');
  const card = adminPage.locator('[data-slot="card"]').filter({
    has: adminPage.locator('[data-slot="card-title"]', {
      hasText: /^Paypal Payment$/
    })
  });
  await expect(card.locator('input[name="paypalClientId"]')).toHaveValue(
    account!.clientId
  );
  await expect(card.getByRole('radio', { name: 'Sandbox' })).toBeChecked();
  await card.locator('input[name="paypalDisplayName"]').fill(PAYPAL_NAME);
  await card.getByRole('radio', { name: 'Capture' }).click();
  const [saved] = await Promise.all([
    adminPage.waitForResponse(
      (r) =>
        r.url().endsWith('/api/settings') && r.request().method() === 'POST'
    ),
    adminPage.getByRole('button', { name: 'Save' }).click()
  ]);
  expect(saved.status(), 'saving the payment settings').toBe(200);
  await adminPage.reload();
  await expect(card.locator('input[name="paypalDisplayName"]')).toHaveValue(
    PAYPAL_NAME
  );
  await expect(card.getByRole('radio', { name: 'Capture' })).toBeChecked();

  await guestReadyToPay(page, world, `${unique('paypal')}@release-check.test`);
  await expect(
    page.getByRole('radio', { name: re(PAYPAL_NAME) })
  ).toBeVisible();
});

test('R-PPL-02 A guest pays with PayPal: back on the success page, the order is paid, confirmation email', async ({
  page
}) => {
  const order = await goToPaypal(page);
  await approveOnPaypal(page);
  await expectSuccessPage(page, order.orderNumber);
  const state = await withAdminApi((api) =>
    waitForPaymentStatus(api, order.uuid, 'paypal_captured')
  );
  expect(state.status).toBe('processing');
  const mail = await waitForMail(order.email, /Your order has been confirmed/);
  expect(mail.body).toContain(`#${order.orderNumber}`);
});

test('R-PPL-03 The shopper cancels on PayPal: back at the checkout with the cart, the order canceled, no email', async ({
  page
}) => {
  const order = await goToPaypal(page);
  await page.locator('#cancelLink').click();
  await page.waitForURL(/\/checkout$/, { timeout: 45_000 });
  await expect(
    page.getByRole('main'),
    'the cart is given back so the shopper can pay another way'
  ).toContainText(world.product.name);
  const state = await withAdminApi((api) =>
    waitForPaymentStatus(api, order.uuid, 'canceled')
  );
  expect(state.status).toBe('canceled');
  // Never placed, so no confirmation and no cancellation email (2.4.0).
  await page.waitForTimeout(3000);
  expect(
    allMail().filter((m) => m.to === order.email),
    'no email for an order that was never placed'
  ).toEqual([]);
});

test('R-PPL-04 Authorize only: the order is authorized; the admin captures it, then refunds it in full', async ({
  page,
  adminPage
}) => {
  await setIntent('AUTHORIZE');
  try {
    const order = await goToPaypal(page);
    await approveOnPaypal(page);
    await expectSuccessPage(page, order.orderNumber);
    await withAdminApi((api) =>
      waitForPaymentStatus(api, order.uuid, 'paypal_authorized')
    );
    await adminCapture(adminPage, order.uuid);
    await withAdminApi((api) =>
      waitForPaymentStatus(api, order.uuid, 'paypal_captured')
    );
    await adminRefundAll(adminPage, order.uuid);
    await withAdminApi((api) =>
      waitForPaymentStatus(api, order.uuid, 'paypal_refunded')
    );
  } finally {
    await setIntent('CAPTURE');
  }
});

// R-STR: Stripe in test mode, through the storefront's Payment Element and the
// admin order page. Stripe's webhooks reach the scratch store through
// `stripe listen`, which run.mjs starts for this pass (step R-STR-00), so these
// tests also prove the webhook path: the order becomes paid only when the
// webhook arrives (the return page sends the shopper to the success page but
// does not change the payment status).
//
// Needs STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY (test mode) in
// tests/e2e/.env.release, and the Stripe CLI; skipped without the keys.
//
// No login / registration POST (guest checkouts only).
import type { Page } from '@playwright/test';
import {
  checkoutWorld,
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
  adminCancel,
  adminCapture,
  adminRefundAll,
  enableStripe,
  STRIPE_NAME,
  stripeAccount,
  stripeIntentOf,
  waitForPaymentStatus,
  type StripeMode
} from '../support/payments';
import { unique } from '../support/store';
import { allowed, expect, test } from '../support/test';

const account = stripeAccount();
test.skip(!account, 'No Stripe test keys in tests/e2e/.env.release');
test.skip(
  !!account && !account.webhookSecret,
  'No Stripe webhook secret: run this spec through run.mjs (it starts stripe listen)'
);

// The admin order page of a cancelable order fails hydration with React #418
// (CancelButton.tsx nests a <button> in a <button>, KNOWN_BUGS).
test.use({
  allowedErrors: allowed(KNOWN_BUGS.nestedButtonHydration.message)
});

/** Stripe's test cards (https://docs.stripe.com/testing). */
const CARD = {
  ok: '4242424242424242',
  threeDSecure: '4000002760003184',
  declined: '4000000000000002'
};

let world: CheckoutWorld;

test.beforeAll(async () => {
  world = await withAdminApi(async (api) => {
    const w = await checkoutWorld(api);
    await enableStripe(api, 'capture');
    return w;
  });
});

async function setMode(mode: StripeMode) {
  await withAdminApi((api) => enableStripe(api, mode));
}

/** Choose the Stripe method and type a card into the Payment Element. */
async function fillCard(page: Page, number: string) {
  const method = page.getByRole('radio', { name: re(STRIPE_NAME) });
  await method.click();
  await expect(method).toBeChecked();
  const element = page.frameLocator('iframe[title="Secure payment input frame"]');
  await element.locator('input[name="number"]').fill(number);
  await element.locator('input[name="expiry"]').fill('12 / 34');
  await element.locator('input[name="cvc"]').fill('123');
  // Stripe guesses the country from the IP address; a US card holder has a ZIP.
  await element.locator('select[name="country"]').selectOption('US');
  const zip = element.locator('input[name="postalCode"]');
  await expect(zip).toBeVisible();
  await zip.fill('94043');
}

/** A guest pays one product by card; returns the order the checkout made. */
async function payByCard(page: Page, card: string) {
  const email = `${unique('stripe')}@release-check.test`;
  await guestReadyToPay(page, world, email);
  await fillCard(page, card);
  const order = await placeOrder(
    page,
    page.getByRole('button', { name: 'Pay with Stripe' }),
    { retries: 1 }
  );
  return { ...order, email };
}

test('R-STR-01 The admin turns Stripe on in the payment settings; the checkout offers it with a test-card form', async ({
  adminPage,
  page
}) => {
  await adminPage.goto('/admin/setting/payments');
  const card = adminPage.locator('[data-slot="card"]').filter({
    has: adminPage.locator('[data-slot="card-title"]', {
      hasText: /^Stripe Payment$/
    })
  });
  await expect(card.locator('input[name="stripePublishableKey"]')).toHaveValue(
    account!.publishableKey
  );
  const name = STRIPE_NAME;
  await card.locator('input[name="stripeDisplayName"]').fill(name);
  await card.getByRole('radio', { name: 'Capture' }).click();
  const [saved] = await Promise.all([
    adminPage.waitForResponse(
      (r) => r.url().endsWith('/api/settings') && r.request().method() === 'POST'
    ),
    adminPage.getByRole('button', { name: 'Save' }).click()
  ]);
  expect(saved.status(), 'saving the payment settings').toBe(200);
  await adminPage.reload();
  await expect(card.locator('input[name="stripeDisplayName"]')).toHaveValue(name);
  await expect(card.getByRole('radio', { name: 'Capture' })).toBeChecked();

  await guestReadyToPay(page, world, `${unique('stripe')}@release-check.test`);
  await page.getByRole('radio', { name: re(name) }).click();
  // A pk_test_ key shows the test cards above the Payment Element.
  await expect(page.getByText('Test card number: 4242 4242 4242 4242')).toBeVisible();
  await expect(
    page
      .frameLocator('iframe[title="Secure payment input frame"]')
      .locator('input[name="number"]')
  ).toBeVisible();
});

test('R-STR-02 A guest pays by card: success page; the webhook marks the order paid; confirmation email', async ({
  page
}) => {
  const order = await payByCard(page, CARD.ok);
  await expectSuccessPage(page, order.orderNumber);
  const state = await withAdminApi((api) =>
    waitForPaymentStatus(api, order.uuid, 'stripe_captured')
  );
  expect(state.status).toBe('processing');
  const mail = await waitForMail(order.email, /Your order has been confirmed/);
  expect(mail.body).toContain(`#${order.orderNumber}`);
  const intent = await stripeIntentOf(order.uuid);
  expect(intent.status).toBe('succeeded');
  expect(intent.amountReceived, 'Stripe took the order total, in cents').toBe(
    Math.round(order.grandTotal * 100)
  );
});

test('R-STR-03 A card that needs 3-D Secure: the shopper completes the challenge and the order is paid', async ({
  page
}) => {
  const order = await payByCard(page, CARD.threeDSecure);
  const challenge = page
    .frameLocator('iframe[src*="three-ds-2-challenge"]')
    .frameLocator('iframe[name="stripe-challenge-frame"]');
  const complete = challenge.getByRole('button', { name: 'Complete' });
  // Stripe's test page ignores a click made before its script is ready, so
  // click until the challenge closes (no store request is repeated).
  await expect(async () => {
    await complete.click({ timeout: 5000 });
    await expect(page).toHaveURL(/\/checkout\/success\//, { timeout: 5000 });
  }).toPass({ timeout: 45_000 });
  await expectSuccessPage(page, order.orderNumber);
  await withAdminApi((api) =>
    waitForPaymentStatus(api, order.uuid, 'stripe_captured')
  );
  await waitForMail(order.email, /Your order has been confirmed/);
});

test('R-STR-04 A declined card: back to the cart with "Payment failed", the items kept, the order failed, no confirmation email', async ({
  page
}) => {
  const order = await payByCard(page, CARD.declined);
  await page.waitForURL(/\/cart$/, { timeout: 60_000 });
  await expect(page.getByText('Payment failed')).toBeVisible();
  await expect(
    page.locator('.cart__item').filter({ hasText: world.product.name }),
    'the cart is given back so the shopper can try again'
  ).toHaveCount(1);
  await withAdminApi((api) =>
    waitForPaymentStatus(api, order.uuid, 'stripe_failed')
  );
  // The webhook (payment_failed) has been handled by now: still no email.
  expect(
    allMail().filter((m) => m.to === order.email),
    'no email for a failed payment'
  ).toEqual([]);
});

test('R-STR-05 Authorize only: the order is authorized; the admin captures it, then refunds it in full; Stripe shows both', async ({
  page,
  adminPage
}) => {
  await setMode('authorizeOnly');
  try {
    const order = await payByCard(page, CARD.ok);
    await expectSuccessPage(page, order.orderNumber);
    await withAdminApi((api) =>
      waitForPaymentStatus(api, order.uuid, 'stripe_authorized')
    );
    expect((await stripeIntentOf(order.uuid)).status).toBe('requires_capture');

    await adminCapture(adminPage, order.uuid);
    await withAdminApi((api) =>
      waitForPaymentStatus(api, order.uuid, 'stripe_captured')
    );
    expect((await stripeIntentOf(order.uuid)).status).toBe('succeeded');

    await adminRefundAll(adminPage, order.uuid);
    // The refund is recorded by the admin request and echoed by the
    // charge.refunded webhook; either way the order ends refunded once.
    await withAdminApi((api) =>
      waitForPaymentStatus(api, order.uuid, 'stripe_refunded')
    );
    const intent = await stripeIntentOf(order.uuid);
    expect(intent.amountRefunded, 'Stripe refunded the whole amount').toBe(
      intent.amountReceived
    );
  } finally {
    await setMode('capture');
  }
});

test('R-STR-06 The admin cancels an authorized order: the order is canceled and Stripe releases the authorization', async ({
  page,
  adminPage
}) => {
  await setMode('authorizeOnly');
  try {
    const order = await payByCard(page, CARD.ok);
    await expectSuccessPage(page, order.orderNumber);
    await withAdminApi((api) =>
      waitForPaymentStatus(api, order.uuid, 'stripe_authorized')
    );
    await adminCancel(adminPage, order.uuid);
    const state = await withAdminApi((api) =>
      waitForPaymentStatus(api, order.uuid, 'canceled')
    );
    expect(state.status).toBe('canceled');
    expect((await stripeIntentOf(order.uuid)).status).toBe('canceled');
    await waitForMail(order.email, /Your order has been canceled/);
  } finally {
    await setMode('capture');
  }
});

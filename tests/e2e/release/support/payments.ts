// Stripe (test mode) and PayPal (sandbox) for the payment specs.
//
// The accounts come from tests/e2e/.env.release (gitignored), which run.mjs
// passes to Playwright; a spec without its keys skips itself. The Stripe
// webhook secret is per run: run.mjs starts `stripe listen` for the Stripe
// pass and passes its secret as STRIPE_WEBHOOK_SECRET.
import type { APIRequestContext, Page } from '@playwright/test';
import { adminGraphql, call } from './checkout';
import { hydrated } from './customer';
import { expect } from './test';

export interface StripeAccount {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
}

export interface PaypalAccount {
  clientId: string;
  clientSecret: string;
  buyerEmail: string;
  buyerPassword: string;
}

export function stripeAccount(): StripeAccount | null {
  const e = process.env;
  if (!e.STRIPE_PUBLISHABLE_KEY || !e.STRIPE_SECRET_KEY) return null;
  return {
    publishableKey: e.STRIPE_PUBLISHABLE_KEY,
    secretKey: e.STRIPE_SECRET_KEY,
    webhookSecret: e.STRIPE_WEBHOOK_SECRET || ''
  };
}

export function paypalAccount(): PaypalAccount | null {
  const e = process.env;
  if (
    !e.PAYPAL_CLIENT_ID ||
    !e.PAYPAL_CLIENT_SECRET ||
    !e.PAYPAL_BUYER_EMAIL ||
    !e.PAYPAL_BUYER_PASSWORD
  )
    return null;
  return {
    clientId: e.PAYPAL_CLIENT_ID,
    clientSecret: e.PAYPAL_CLIENT_SECRET,
    buyerEmail: e.PAYPAL_BUYER_EMAIL,
    buyerPassword: e.PAYPAL_BUYER_PASSWORD
  };
}

export const STRIPE_NAME = 'Card (release check)';
export const PAYPAL_NAME = 'PayPal (release check)';

export type StripeMode = 'capture' | 'authorizeOnly';
export type PaypalIntent = 'CAPTURE' | 'AUTHORIZE';

/** Stripe on, in test mode, with this run's webhook secret. */
export async function enableStripe(
  api: APIRequestContext,
  mode: StripeMode = 'capture'
) {
  const a = stripeAccount();
  if (!a) throw new Error('No Stripe test keys in tests/e2e/.env.release');
  await call(api, 'POST', '/api/settings', {
    stripePaymentStatus: 1,
    stripeDisplayName: STRIPE_NAME,
    stripePublishableKey: a.publishableKey,
    stripeSecretKey: a.secretKey,
    stripeEndpointSecret: a.webhookSecret,
    stripePaymentMode: mode
  });
}

/** PayPal on, against the sandbox. */
export async function enablePaypal(
  api: APIRequestContext,
  intent: PaypalIntent = 'CAPTURE'
) {
  const a = paypalAccount();
  if (!a) throw new Error('No PayPal sandbox account in tests/e2e/.env.release');
  await call(api, 'POST', '/api/settings', {
    paypalPaymentStatus: 1,
    paypalDisplayName: PAYPAL_NAME,
    paypalClientId: a.clientId,
    paypalClientSecret: a.clientSecret,
    paypalEnvironment: 'https://api-m.sandbox.paypal.com',
    paypalPaymentIntent: intent
  });
}

/** Payment status of an order, polled until it is `code` (webhooks are async). */
export async function waitForPaymentStatus(
  api: APIRequestContext,
  uuid: string,
  code: string,
  timeoutMs = 60_000
): Promise<{ status: string; paymentStatus: string }> {
  let last = { status: '', paymentStatus: '' };
  await expect
    .poll(
      async () => {
        const data = await adminGraphql(
          api,
          `query Status($uuid: String!) {
            order(uuid: $uuid) { status { code } paymentStatus { code } }
          }`,
          { uuid }
        );
        last = {
          status: data.order.status.code,
          paymentStatus: data.order.paymentStatus.code
        };
        return last.paymentStatus;
      },
      {
        message: `payment status of order ${uuid}`,
        timeout: timeoutMs,
        intervals: [1000, 2000, 3000]
      }
    )
    .toBe(code);
  return last;
}

/** Stripe's own record of an order's payment (the newest intent made for it). */
export async function stripeIntentOf(orderUuid: string): Promise<{
  id: string;
  status: string;
  amount: number;
  amountReceived: number;
  amountRefunded: number;
}> {
  const a = stripeAccount();
  if (!a) throw new Error('No Stripe test keys');
  const res = await fetch(
    'https://api.stripe.com/v1/payment_intents?limit=20&expand[]=data.latest_charge',
    { headers: { Authorization: `Bearer ${a.secretKey}` } }
  );
  const json: any = await res.json();
  if (!res.ok) throw new Error(`Stripe answered ${res.status}: ${json?.error?.message}`);
  const pi = json.data.find((p: any) => p.metadata?.order_id === orderUuid);
  if (!pi) throw new Error(`Stripe has no payment intent for order ${orderUuid}`);
  return {
    id: pi.id,
    status: pi.status,
    amount: pi.amount,
    amountReceived: pi.amount_received,
    amountRefunded: pi.latest_charge?.amount_refunded ?? 0
  };
}

/** A response's body for a failure message; the page may have reloaded
 *  (and dropped the body) by the time it is read. */
async function bodyOf(res: { text(): Promise<string> }): Promise<string> {
  return res.text().catch(() => '(body no longer available)');
}

/** Admin order page → Capture Payment; the page reloads with the new state. */
export async function adminCapture(page: Page, uuid: string) {
  await page.goto(`/admin/order/edit/${uuid}`);
  const [captured] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/orders/${uuid}/capture`) &&
        r.request().method() === 'POST'
    ),
    (await hydrated(page.getByRole('button', { name: 'Capture Payment' }))).click()
  ]);
  if (captured.status() !== 200)
    throw new Error(`capture answered ${captured.status()}: ${await bodyOf(captured)}`);
  await expect(page.getByRole('button', { name: 'Capture Payment' })).toHaveCount(
    0
  );
}

/** Admin order page → Refund → the full amount (the dialog's default). */
export async function adminRefundAll(page: Page, uuid: string) {
  await page.goto(`/admin/order/edit/${uuid}`);
  await (await hydrated(page.getByRole('button', { name: 'Refund' }))).click();
  // By CSS, not by role: components/common/modal/Alert.jsx marks its
  // role="dialog" wrapper aria-hidden, which hides the whole window from
  // screen readers (and from getByRole). A core accessibility bug.
  const dialog = page
    .locator('.modal-wrapper[role="dialog"]')
    .filter({ hasText: 'Refund amount' });
  await expect(dialog).toBeVisible();
  const [refunded] = await Promise.all([
    page.waitForResponse(
      (r) => /\/api\/orders\/[^/]+\/refund/.test(r.url()) && r.request().method() === 'POST'
    ),
    dialog
      .getByRole('button', { name: 'Refund', exact: true, includeHidden: true })
      .click()
  ]);
  if (refunded.status() !== 200)
    throw new Error(`refund answered ${refunded.status()}: ${await bodyOf(refunded)}`);
  await expect(page.getByRole('button', { name: 'Refund' })).toHaveCount(0);
}

/** Admin order page → Cancel Order with a reason. */
export async function adminCancel(page: Page, uuid: string) {
  await page.goto(`/admin/order/edit/${uuid}`);
  // `.first()`: the trigger nests a second "Cancel Order" button (#418, see
  // KNOWN_BUGS.nestedButtonHydration).
  await (
    await hydrated(page.getByRole('button', { name: 'Cancel Order' }).first())
  ).click();
  const dialog = page.getByRole('dialog', { name: 'Cancel Order' });
  await dialog
    .getByRole('textbox', { name: /Reason for cancellation/ })
    .fill('Release check: the customer changed their mind');
  const [canceled] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/orders/${uuid}/cancel`) &&
        r.request().method() === 'POST'
    ),
    dialog.getByRole('button', { name: 'Submit Cancellation' }).click()
  ]);
  if (canceled.status() !== 200)
    throw new Error(`cancel answered ${canceled.status()}: ${await bodyOf(canceled)}`);
}

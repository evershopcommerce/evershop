// The storefront checkout form, step by step, for the specs that buy through
// the browser: 04-checkout (Cash on Delivery), 06-stripe and 07-paypal.
import type { Locator, Page } from '@playwright/test';
import { re, US_ADDRESS, type CheckoutWorld, type TestProduct } from './checkout';
import { expect, test } from './test';

export const money = (n: number) => `$${n.toFixed(2)}`;

/** "Total … $12.50" as a RegExp (the summary's spans join without spaces). */
export const totalLine = (n: number) =>
  new RegExp(`Total.*\\$${n.toFixed(2).replace('.', '\\.')}`);

/** Product page → Add to cart; the mini cart opens with the product. */
export async function addToCart(
  page: Page,
  product: TestProduct,
  qty = 1
): Promise<Locator> {
  await page.goto(`/product/${product.uuid}`);
  await expect(
    page.getByRole('heading', { level: 1, name: product.name })
  ).toBeVisible();
  if (qty !== 1)
    await page.getByRole('spinbutton', { name: /Quantity/ }).fill(String(qty));
  await page.getByRole('button', { name: 'Add to cart' }).click();
  const miniCart = page.getByRole('dialog', { name: 'Your Cart' });
  await expect(miniCart).toContainText(product.name);
  return miniCart;
}

/** The country-aware shipping address form, for a US address. */
export async function fillUsShippingAddress(page: Page) {
  const fullName = page.getByRole('textbox', { name: /^Full name/ });
  await expect(fullName).toBeVisible();
  // One shipping country → a read-only "Country United States"; several → a select.
  const country = page.getByRole('combobox', { name: /^Country/ });
  if (await country.count()) {
    await country.click();
    await page
      .getByRole('option', { name: 'United States', exact: true })
      .click();
  }
  await expect(page.getByRole('combobox', { name: /^State/ })).toBeVisible();
  await fullName.fill(US_ADDRESS.recipient);
  await page
    .getByRole('textbox', { name: /^Telephone/ })
    .fill(US_ADDRESS.telephone);
  await page
    .getByRole('textbox', { name: /^Address( \*)?$/ })
    .fill(US_ADDRESS.address_line_1);
  await page.getByRole('textbox', { name: /^City/ }).fill(US_ADDRESS.locality);
  await page.getByRole('combobox', { name: /^State/ }).click();
  await page
    .getByRole('option', { name: US_ADDRESS.regionName, exact: true })
    .click();
  await page
    .getByRole('textbox', { name: /^ZIP code/ })
    .fill(US_ADDRESS.postal_code);
}

/** Pick this run's flat-rate method (appears once the address is complete). */
export async function chooseShippingMethod(
  page: Page,
  world: Pick<CheckoutWorld, 'methodName'>
) {
  const method = page.getByRole('radio', { name: re(world.methodName) });
  await expect(
    method,
    'the flat-rate method is offered for the US address'
  ).toBeVisible();
  const [saved] = await Promise.all([
    page.waitForResponse(
      (r) =>
        /\/api\/carts\/[^/]+\/shippingMethods$/.test(r.url()) &&
        r.request().method() === 'POST'
    ),
    method.click()
  ]);
  expect(saved.status(), 'saving the shipping method').toBe(200);
  await expect(method).toBeChecked();
  await expect(page.getByText(`Shipping (${world.methodName})`)).toBeVisible();
}

/**
 * A guest with one product in the cart, on the checkout page with the email,
 * the US address and the flat-rate method filled in: ready to pay.
 */
export async function guestReadyToPay(
  page: Page,
  world: Pick<CheckoutWorld, 'methodName'> & { product: TestProduct },
  email: string,
  qty = 1
) {
  await addToCart(page, world.product, qty);
  await page.goto('/checkout');
  await page.getByRole('textbox', { name: /^Email/ }).fill(email);
  await fillUsShippingAddress(page);
  await chooseShippingMethod(page, world);
}

/**
 * Click the payment step's button and return the order the checkout made
 * (`POST /api/carts/:id/checkout`; the order exists before the payment).
 *
 * `retries`: a payment form may refuse the click with a toast (Stripe's
 * `elements.submit()` validates the card fields first, and a click right
 * after typing can come before Stripe has the last field). Then no order is
 * made, so clicking again is safe; the toast is noted in the report.
 */
export async function placeOrder(
  page: Page,
  button: Locator,
  { retries = 0 }: { retries?: number } = {}
): Promise<{ uuid: string; orderNumber: string; grandTotal: number }> {
  const toast = page.locator('[data-sonner-toast]').first();
  const seen: string[] = [];
  for (let attempt = 0; attempt <= retries; attempt++) {
    const placed = page
      .waitForResponse(
        (r) =>
          /\/api\/carts\/[^/]+\/checkout$/.test(r.url()) &&
          r.request().method() === 'POST',
        { timeout: 20_000 }
      )
      .catch(() => null);
    // An earlier toast (say, about the shipping method) is not this click's.
    await toast.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    await button.click();
    const first = await Promise.race([
      placed.then((res) => ({ res })),
      toast
        .waitFor({ state: 'visible', timeout: 20_000 })
        .then(async () => ({ toast: (await toast.textContent()) || '' }))
        .catch(() => ({ toast: '' }))
    ]);
    // A toast can also come with a placed order: wait for the request too.
    const res = 'res' in first ? first.res : await placed;
    if (res) {
      expect(res.status(), 'placing the order').toBe(200);
      const order = (await res.json()).data;
      return {
        uuid: order.uuid,
        orderNumber: String(order.order_number),
        grandTotal: Number(order.grand_total)
      };
    }
    const text = 'toast' in first ? first.toast : '';
    seen.push(text || '(no message)');
    test.info().annotations.push({
      type: 'note',
      description: `The payment button made no order (message: ${
        text || 'none'
      })${attempt < retries ? '; clicked again' : ''}`
    });
    await toast.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  }
  throw new Error(
    `The payment button made no order after ${retries + 1} click(s). Messages: ${seen.join(
      ' | '
    )}`
  );
}

/** The checkout success page of `orderNumber`. */
export async function expectSuccessPage(page: Page, orderNumber: string) {
  await page.waitForURL(/\/checkout\/success\//, { timeout: 60_000 });
  await expect(
    page.getByRole('heading', { name: 'Thank you for your order!' })
  ).toBeVisible();
  await expect(page.locator('p', { hasText: /is confirmed/ })).toContainText(
    `Order #${orderNumber} is confirmed`
  );
}

// R-CHK: the storefront buy path. Add to cart, guest checkout with Cash on
// Delivery, a coupon made in the admin, a registered customer's checkout, and
// the stock an order takes.
//
// Login / registration / password POSTs used by this file and 05-orders
// together: 2 of the store's 8 per 15 minutes —
//   R-CHK-04: POST /api/customers (the registration form) and the
//   POST /customer/login the form makes right after it (automatic sign-in).
//
// Set-up (beforeAll, admin REST API, idempotent, made once per store and
// reused, see support/checkout.ts checkoutWorld): COD on, a US zone with a
// flat-rate method, a package, a product with a large stock. The stock test
// makes its own product.
import type { Page } from '@playwright/test';
import {
  adminOrder,
  checkoutPayload,
  checkoutWorld,
  COD_NAME,
  createProduct,
  FLAT_RATE,
  placeCodOrder,
  re,
  SHARED_PRICE,
  stockOf,
  US_ADDRESS,
  withAdminApi,
  type CheckoutWorld
} from '../support/checkout';
import {
  addToCart,
  chooseShippingMethod as chooseMethod,
  fillUsShippingAddress,
  money,
  totalLine
} from '../support/checkoutUi';
import { waitForMail } from '../support/mail';
import { unique } from '../support/store';
import { expect, test } from '../support/test';

let world: CheckoutWorld;

test.beforeAll(async () => {
  world = await withAdminApi(checkoutWorld);
});

const chooseShippingMethod = (page: Page) => chooseMethod(page, world);

/** Cash on Delivery → Place Order → the success page; returns the order number. */
async function payCodAndPlaceOrder(
  page: Page
): Promise<{ orderNumber: string; uuid: string }> {
  await page.getByRole('radio', { name: COD_NAME }).click();
  await expect(page.getByRole('radio', { name: COD_NAME })).toBeChecked();
  const [placed] = await Promise.all([
    page.waitForResponse(
      (r) =>
        /\/api\/carts\/[^/]+\/checkout$/.test(r.url()) &&
        r.request().method() === 'POST'
    ),
    page.getByRole('button', { name: 'Place Order' }).click()
  ]);
  expect(placed.status(), 'placing the order').toBe(200);
  const order = (await placed.json()).data;
  await page.waitForURL(/\/checkout\/success\//);
  await expect(
    page.getByRole('heading', { name: 'Thank you for your order!' })
  ).toBeVisible();
  await expect(page.locator('p', { hasText: /is confirmed/ })).toContainText(
    `Order #${order.order_number} is confirmed`
  );
  return { orderNumber: String(order.order_number), uuid: order.uuid };
}

test('R-CHK-01 Add to cart from the product page; change the quantity in the cart; remove and add again', async ({
  page
}) => {
  const product = world.product;

  const miniCart = await addToCart(page, product);
  await expect(miniCart).toContainText(
    new RegExp(`Subtotal:\\s*\\${money(SHARED_PRICE)}`)
  );
  await miniCart.getByRole('button', { name: 'View Cart (1)' }).click();
  await expect(page).toHaveURL(/\/cart$/);

  const row = page.locator('.cart__item').filter({ hasText: product.name });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(money(SHARED_PRICE));

  // The +/- buttons have no accessible name: found by their icon.
  const [increased] = await Promise.all([
    page.waitForResponse(
      (r) =>
        /\/api\/cart\/.+\/items\/[^/]+$/.test(r.url()) &&
        r.request().method() === 'PATCH'
    ),
    row.locator('button:has(svg.lucide-plus)').click()
  ]);
  expect(increased.status(), 'updating the quantity').toBe(200);
  await expect(row).toContainText(money(2 * SHARED_PRICE));
  await expect(
    page.getByRole('button', { name: 'Shopping cart with 2 items' })
  ).toBeVisible();
  await page.reload();
  await expect(row, 'the new quantity is saved on the server').toContainText(
    money(2 * SHARED_PRICE)
  );

  const [removed] = await Promise.all([
    page.waitForResponse(
      (r) =>
        /\/api\/cart\/.+\/items\/[^/]+$/.test(r.url()) &&
        r.request().method() === 'DELETE'
    ),
    row.getByRole('button', { name: 'Remove' }).click()
  ]);
  expect(removed.status(), 'removing the item').toBe(200);
  await expect(page.getByText('Your cart is empty!')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Shopping cart with 0 items' })
  ).toBeVisible();

  const again = await addToCart(page, product, 3);
  await expect(
    again.getByRole('button', { name: 'View Cart (3)' })
  ).toBeVisible();
  await page.goto('/cart');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(money(3 * SHARED_PRICE));
});

test('R-CHK-02 A guest checks out with Cash on Delivery: success page with the order number, confirmation email', async ({
  page
}) => {
  const product = world.product;
  const email = `${unique('guest')}@release-check.test`;
  const total = 2 * SHARED_PRICE + FLAT_RATE;

  await addToCart(page, product, 2);
  await page.goto('/checkout');
  await page.getByRole('textbox', { name: /^Email/ }).fill(email);
  await fillUsShippingAddress(page);
  await chooseShippingMethod(page);
  await expect(page.getByRole('main')).toContainText(totalLine(total));
  const { orderNumber } = await payCodAndPlaceOrder(page);

  const main = page.getByRole('main');
  await expect(main).toContainText(email);
  await expect(main).toContainText(
    `${US_ADDRESS.locality}, ${US_ADDRESS.regionName} ${US_ADDRESS.postal_code}`
  );
  await expect(main).toContainText(COD_NAME);
  await expect(main).toContainText(product.name);
  await expect(main).toContainText(`Shipping (${world.methodName})`);
  await expect(main).toContainText(totalLine(total));

  const mail = await waitForMail(email, /Your order has been confirmed/);
  expect(mail.body, 'the confirmation email names the order').toContain(
    `#${orderNumber}`
  );
});

test.describe('R-CHK-03', () => {
  // The storefront logs the failed request of the invalid coupon code. A
  // correct store answers 400; a 500 stays a failure (see the test).
  test.use({ allowedErrors: [/status of 400/] });

  test('R-CHK-03 A percentage coupon made in the admin discounts the cart and the order; an invalid code shows an error', async ({
    page,
    adminPage
  }) => {
    const code = unique('RC10')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();
    const discount = SHARED_PRICE / 10;
    // Through the admin form: POST /api/coupons without condition /
    // user_condition saves a coupon that never applies (known API bug).
    await adminPage.goto('/admin/coupon/new');
    await adminPage.locator('input[name="coupon"]').fill(code);
    await adminPage
      .locator('textarea[name="description"]')
      .fill('Release check: 10% off the order');
    await adminPage.locator('input[name="discount_amount"]').fill('10');
    await adminPage
      .getByRole('radio', { name: 'Percentage discount to entire order' })
      .click();
    const [created] = await Promise.all([
      adminPage.waitForResponse(
        (r) =>
          r.url().endsWith('/api/coupons') && r.request().method() === 'POST'
      ),
      adminPage.getByRole('button', { name: 'Save' }).click()
    ]);
    expect(created.status(), 'saving the coupon').toBe(200);
    await adminPage.waitForURL(/\/admin\/coupon\/edit\//);
    await expect(adminPage.locator('input[name="coupon"]')).toHaveValue(code);

    await addToCart(page, world.product);
    await page.goto('/cart');
    const couponInput = page.getByRole('textbox', {
      name: 'Enter coupon code'
    });

    // An unknown code: an error message, and a client error (400), not a 500.
    await couponInput.fill(`NOPE${code}`);
    const [refused] = await Promise.all([
      page.waitForResponse(
        (r) =>
          /\/api\/carts\/[^/]+\/coupons$/.test(r.url()) &&
          r.request().method() === 'POST'
      ),
      page.getByRole('button', { name: 'Apply' }).click()
    ]);
    await expect(page.getByText('Invalid coupon')).toBeVisible();
    expect
      .soft(
        refused.status(),
        `an unknown coupon code answers 400 (body: ${await refused.text()})`
      )
      .toBe(400);
    await expect(page.getByText(/Discount\(/)).toHaveCount(0);

    await couponInput.fill(code);
    const [applied] = await Promise.all([
      page.waitForResponse(
        (r) =>
          /\/api\/carts\/[^/]+\/coupons$/.test(r.url()) &&
          r.request().method() === 'POST'
      ),
      page.getByRole('button', { name: 'Apply' }).click()
    ]);
    expect(applied.status(), 'applying the coupon').toBe(200);
    await expect(page.getByText('Coupon applied successfully!')).toBeVisible();
    const discountLine = new RegExp(
      `Discount\\(${code}\\)[\\s-]*\\${money(discount)}`
    );
    await expect(page.getByRole('main')).toContainText(discountLine);
    await expect(page.getByRole('main')).toContainText(
      totalLine(SHARED_PRICE - discount)
    );

    // The checkout page carries the discount. The order is then placed in one
    // call with this browser's session (the checkout form is R-CHK-02's job;
    // fewer calls keep the suite under the store's API rate limit).
    await page.goto('/checkout');
    await expect(page.getByRole('main')).toContainText(discountLine);
    const cartId = new URL(applied.url()).pathname.split('/')[3];
    const email = `${unique('coupon')}@release-check.test`;
    const placed = await page.request.post(`/api/carts/${cartId}/checkout`, {
      data: checkoutPayload(world, cartId, email)
    });
    expect(placed.status(), 'placing the order').toBe(200);
    const { uuid } = (await placed.json()).data;
    await page.goto(`/checkout/success/${uuid}`);
    await expect(
      page.getByRole('heading', { name: 'Thank you for your order!' })
    ).toBeVisible();
    await expect(page.getByRole('main')).toContainText(discountLine);
    await expect(page.getByRole('main')).toContainText(
      totalLine(SHARED_PRICE - discount + FLAT_RATE)
    );

    const order = await withAdminApi((api) => adminOrder(api, uuid));
    expect(order.coupon).toBe(code);
    expect(order.discountAmount.value).toBe(discount);
    expect(order.grandTotal.value).toBe(SHARED_PRICE - discount + FLAT_RATE);
  });
});

test('R-CHK-04 A customer registers on the storefront, checks out, and finds the order in their account', async ({
  page
}) => {
  const email = `${unique('member')}@release-check.test`;
  const fullName = 'Rita Release';

  // Auth POSTs 1 and 2 of this file's budget: registration + automatic sign-in.
  await page.goto('/account/register');
  await page.getByRole('textbox', { name: /^Full Name/ }).fill(fullName);
  await page.getByRole('textbox', { name: /^Email/ }).fill(email);
  await page.getByLabel(/^Password/).fill(`Rc-${unique('pw')}`);
  const [registered, signedIn] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().endsWith('/api/customers') && r.request().method() === 'POST'
    ),
    page.waitForResponse(
      (r) =>
        r.url().endsWith('/customer/login') && r.request().method() === 'POST'
    ),
    page.getByRole('button', { name: 'Sign Up' }).click()
  ]);
  expect(registered.status(), 'registration').toBe(200);
  expect(signedIn.status(), 'automatic sign-in after registration').toBe(200);
  await page.waitForURL((u) => !u.pathname.startsWith('/account/register'));

  await addToCart(page, world.product);
  await page.goto('/checkout');
  await expect(page.getByText(`Logged in as ${fullName}`)).toBeVisible();
  await expect(page.getByRole('main')).toContainText(email);
  await fillUsShippingAddress(page);
  await chooseShippingMethod(page);
  const { orderNumber } = await payCodAndPlaceOrder(page);

  await page.goto('/account/orders');
  await expect(
    page.getByRole('link', { name: re(`Order #${orderNumber}`) })
  ).toBeVisible();
  const mail = await waitForMail(email, /Your order has been confirmed/);
  expect(mail.body).toContain(`#${orderNumber}`);
});

test('R-CHK-05 An order takes its quantity from the stock', async ({
  adminPage
}) => {
  const product = await withAdminApi((api) =>
    createProduct(api, world, { price: 20, qty: 10, label: 'Stock' })
  );
  await placeCodOrder(world, [{ product, qty: 3 }]);
  expect(
    await withAdminApi((api) => stockOf(api, product.id)),
    'stock 10 after an order of 3'
  ).toBe(7);
  // The admin product list shows the same stock.
  await adminPage.goto(
    `/admin/products?keyword=${encodeURIComponent(product.sku)}`
  );
  const row = adminPage.getByRole('row').filter({ hasText: product.name });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole('cell', { name: '7', exact: true })).toBeVisible();
});

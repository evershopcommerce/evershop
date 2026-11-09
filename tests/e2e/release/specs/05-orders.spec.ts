// R-ORD: the admin side of an order. The order list and page, recording the
// cash of a COD order (capture), a shipment through delivery, cancellation.
//
// No login / registration POSTs (the admin session is the saved one; orders
// are placed as guests). Orders come from the storefront REST API
// (support/checkout.ts placeCodOrder): the checkout UI is covered by 04.
// Every test places its own order; the stock tests make their own product.
// API calls are kept few: the store allows 120 a minute per IP for the whole
// suite, so statuses are read from the order page where it shows them.
import type { Page } from '@playwright/test';
import {
  adminOrderAndStock,
  call,
  checkoutWorld,
  COD_NAME,
  createProduct,
  FLAT_RATE,
  placeCodOrder,
  SHARED_PRICE,
  US_ADDRESS,
  withAdminApi,
  type CheckoutWorld
} from '../support/checkout';
import { KNOWN_BUGS } from '../support/knownBugs';
import { waitForMail } from '../support/mail';
import { expect, test } from '../support/test';

// The admin order page of a cancelable order fails hydration with React
// error #418: oms/pages/admin/orderEdit/CancelButton.tsx renders
// <DialogTrigger><Button/></DialogTrigger> (a <button> in a <button>), the
// same defect as KNOWN_BUGS.nestedButtonHydration. Allowed here so the order
// flow is still checked; the order page is not listed in that entry yet (no
// test catches it on this page), see the release-check report.
test.use({ allowedErrors: [KNOWN_BUGS.nestedButtonHydration.message] });

let world: CheckoutWorld;

test.beforeAll(async () => {
  world = await withAdminApi(checkoutWorld);
});

const money = (n: number) => `$${n.toFixed(2)}`;
/** `text` as a piece of a RegExp. */
const esc = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The admin card whose title is exactly `title` (`hasText` alone is a
 *  case-insensitive substring: "Items" would also match "2 items"). */
const card = (page: Page, title: string) =>
  page.locator('[data-slot="card"]').filter({
    has: page.locator('[data-slot="card-title"]', {
      hasText: new RegExp(`^${esc(title)}$`)
    })
  });
/** The order status badge next to the page heading. */
const orderStatus = (page: Page, name: string) =>
  page.getByText(name, { exact: true });

test('R-ORD-01 The admin finds the order in the list; the order page shows items, totals, addresses, payment and shipment status', async ({
  adminPage
}) => {
  const product = world.product;
  const order = await placeCodOrder(world, [{ product, qty: 2 }]);
  const total = 2 * SHARED_PRICE + FLAT_RATE;

  await adminPage.goto(
    `/admin/orders?keyword=${encodeURIComponent(order.email)}`
  );
  const row = adminPage
    .getByRole('row')
    .filter({ hasText: `#${order.orderNumber}` });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(order.email);
  await expect(row).toContainText(money(total));
  await expect(row).toContainText('Pending');
  await row.getByRole('link', { name: `#${order.orderNumber}` }).click();
  await adminPage.waitForURL(new RegExp(`/admin/order/edit/${order.uuid}`));

  await expect(
    adminPage.getByRole('heading', { name: `Editing #${order.orderNumber}` })
  ).toBeVisible();
  await expect(orderStatus(adminPage, 'New')).toBeVisible();
  const items = card(adminPage, 'Items');
  await expect(items).toContainText(product.name);
  await expect(items).toContainText(product.sku);
  await expect(items).toContainText(`${money(SHARED_PRICE)} × 2`);
  await expect(items).toContainText(money(2 * SHARED_PRICE));
  // Payment status and method, then the totals.
  await expect(adminPage.getByText(`Pending - ${COD_NAME}`)).toBeVisible();
  const body = adminPage.locator('body');
  await expect(body).toContainText(
    new RegExp(`Subtotal\\s*2 items\\s*${esc(money(2 * SHARED_PRICE))}`)
  );
  await expect(body).toContainText(
    new RegExp(
      `Shipping\\s*${esc(world.methodName)}\\s*${esc(money(FLAT_RATE))}`
    )
  );
  await expect(body).toContainText(new RegExp(`Total\\s*${esc(money(total))}`));
  // Shipment status: the item is not shipped yet; a shipment can be created.
  await expect(items).toContainText('Pending');
  await expect(
    adminPage.getByRole('button', { name: 'Create shipment' })
  ).toBeVisible();
  // Customer and addresses (the card's lines join without spaces).
  const customer = card(adminPage, 'Customer Information');
  await expect(customer).toContainText(`${order.email} (Guest Checkout)`);
  const address = [
    US_ADDRESS.recipient,
    US_ADDRESS.address_line_1,
    `${US_ADDRESS.locality}, ${US_ADDRESS.regionName} ${US_ADDRESS.postal_code}`,
    'United States'
  ]
    .map(esc)
    .join('\\s*');
  await expect(customer).toContainText(
    new RegExp(`Shipping Address\\s*${address}`)
  );
  await expect(customer).toContainText(
    new RegExp(`Billing address\\s*${address}`)
  );
});

test('R-ORD-02 The admin records the cash of a COD order (Capture Payment): the order is paid', async ({
  adminPage
}) => {
  const order = await placeCodOrder(world, [
    { product: world.product, qty: 1 }
  ]);

  await adminPage.goto(`/admin/order/edit/${order.uuid}`);
  await expect(adminPage.getByText(`Pending - ${COD_NAME}`)).toBeVisible();
  const [captured] = await Promise.all([
    adminPage.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/orders/${order.uuid}/capture`) &&
        r.request().method() === 'POST'
    ),
    adminPage.getByRole('button', { name: 'Capture Payment' }).click()
  ]);
  expect(captured.status(), 'capture').toBe(200);
  // The page reloads with the new state.
  await expect(adminPage.getByText(`Paid - ${COD_NAME}`)).toBeVisible();
  await expect(orderStatus(adminPage, 'Processing')).toBeVisible();
  await expect(
    adminPage.getByRole('button', { name: 'Capture Payment' })
  ).toHaveCount(0);
  await expect(adminPage.getByRole('button', { name: 'Refund' })).toBeVisible();
  // A paid COD order can no longer be canceled (refund first).
  await expect(
    adminPage.getByRole('button', { name: 'Cancel Order' })
  ).toHaveCount(0);
});

test('R-ORD-03 The admin ships an order and marks the shipment delivered; the customer gets both emails', async ({
  adminPage
}) => {
  const product = world.product;
  const order = await placeCodOrder(world, [{ product, qty: 2 }]);
  // Cash already recorded, so delivery completes the order.
  await withAdminApi((api) =>
    call(api, 'POST', `/api/orders/${order.uuid}/capture`, {})
  );

  await adminPage.goto(`/admin/order/edit/${order.uuid}`);
  await adminPage.getByRole('button', { name: 'Create shipment' }).click();
  const dialog = adminPage.getByRole('dialog', { name: 'Create shipment' });
  await expect(dialog).toContainText(product.name);
  await expect(dialog).toContainText('2 of 2 available to ship');
  await expect(dialog.getByRole('combobox')).toHaveValue('custom');
  // Core's only carrier, "Custom / Other", has no tracking capability, so the
  // form offers no tracking number field for it.
  await expect(dialog.getByPlaceholder(/9400/)).toHaveCount(0);
  await expect(
    dialog.getByRole('switch', { name: /Notify customer/ })
  ).toBeChecked();
  const [shipped] = await Promise.all([
    adminPage.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/orders/${order.uuid}/shipments`) &&
        r.request().method() === 'POST'
    ),
    dialog.getByRole('button', { name: 'Create shipment' }).click()
  ]);
  expect(shipped.status(), 'creating the shipment').toBe(200);
  const shipments = card(adminPage, 'Shipments');
  await expect(shipments).toContainText('Shipped');
  await expect(shipments).toContainText('Custom / Other');
  await expect(shipments).toContainText(
    new RegExp(`${esc(product.name)}\\s*× 2`)
  );
  await expect(card(adminPage, 'Items')).toContainText('All items fulfilled');
  await waitForMail(
    order.email,
    new RegExp(`Your order #${order.orderNumber} is on the way`)
  );

  await shipments.getByRole('button', { name: 'Mark delivered' }).click();
  const confirm = adminPage.getByRole('alertdialog', {
    name: 'Mark shipment as delivered?'
  });
  const [delivered] = await Promise.all([
    adminPage.waitForResponse(
      (r) =>
        /\/api\/shipments\/[^/]+\/markDelivered$/.test(r.url()) &&
        r.request().method() === 'POST'
    ),
    confirm.getByRole('button', { name: 'Mark delivered' }).click()
  ]);
  expect(delivered.status(), 'marking the shipment delivered').toBe(200);
  await expect(shipments).toContainText('Delivered');
  await expect(
    shipments.getByRole('button', { name: 'Mark delivered' })
  ).toHaveCount(0);
  await expect(
    orderStatus(adminPage, 'Completed'),
    'paid + delivered'
  ).toBeVisible();
  await waitForMail(
    order.email,
    new RegExp(`Your order #${order.orderNumber} has been delivered`)
  );
});

test('R-ORD-04 The admin cancels an order: it is canceled and its stock comes back', async ({
  adminPage
}) => {
  const product = await withAdminApi((api) =>
    createProduct(api, world, { price: 15, qty: 20, label: 'Cancel' })
  );
  const order = await placeCodOrder(world, [{ product, qty: 4 }]);
  const before = await withAdminApi((api) =>
    adminOrderAndStock(api, order.uuid, product.id)
  );
  expect(before.stock, 'the order took 4 of 20').toBe(16);

  await adminPage.goto(`/admin/order/edit/${order.uuid}`);
  await expect(
    adminPage.getByRole('heading', { name: `Editing #${order.orderNumber}` })
  ).toBeVisible();
  // `.first()`: the trigger nests a second "Cancel Order" button (the #418 above).
  await adminPage.getByRole('button', { name: 'Cancel Order' }).first().click();
  const dialog = adminPage.getByRole('dialog', { name: 'Cancel Order' });
  await dialog
    .getByRole('textbox', { name: /Reason for cancellation/ })
    .fill('Release check: the customer changed their mind');
  const [canceled] = await Promise.all([
    adminPage.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/orders/${order.uuid}/cancel`) &&
        r.request().method() === 'POST'
    ),
    dialog.getByRole('button', { name: 'Submit Cancellation' }).click()
  ]);
  expect(canceled.status(), 'cancel').toBe(200);
  await expect(adminPage.getByText(`Canceled - ${COD_NAME}`)).toBeVisible();
  await expect(orderStatus(adminPage, 'Canceled')).toBeVisible();

  const after = await withAdminApi((api) =>
    adminOrderAndStock(api, order.uuid, product.id)
  );
  expect(after.order.status.code).toBe('canceled');
  expect(after.order.paymentStatus.code).toBe('canceled');
  expect(after.stock, 'the 4 units are back').toBe(20);
  await waitForMail(order.email, /Your order has been canceled/);
});

test('R-ORD-05 A canceled order cannot be canceled again (no second restock)', async ({
  adminPage
}) => {
  const product = await withAdminApi((api) =>
    createProduct(api, world, { price: 15, qty: 10, label: 'Recancel' })
  );
  const order = await placeCodOrder(world, [{ product, qty: 2 }]);
  await withAdminApi((api) =>
    call(api, 'POST', `/api/orders/${order.uuid}/cancel`, {
      reason: 'Release check: first cancel'
    })
  );

  await adminPage.goto(`/admin/order/edit/${order.uuid}`);
  await expect(adminPage.getByText(`Canceled - ${COD_NAME}`)).toBeVisible();
  await expect
    .soft(
      adminPage.getByRole('button', { name: 'Cancel Order' }),
      'a canceled order offers no Cancel Order'
    )
    .toHaveCount(0);

  await withAdminApi(async (api) => {
    const again = await api.post(`/api/orders/${order.uuid}/cancel`, {
      data: { reason: 'Release check: second cancel' }
    });
    // Refused = not a success. (The route answers every refusal with a 500
    // today, e.g. canceling a paid order; the code is not what this checks.)
    expect
      .soft(
        again.ok(),
        `a second cancel is refused (answered ${again.status()}: ${await again.text()})`
      )
      .toBe(false);
    // 10 = given back once (R-ORD-04 checks that); 12 = given back twice.
    expect(
      (await adminOrderAndStock(api, order.uuid, product.id)).stock,
      'the stock is given back once'
    ).toBe(10);
  });
});

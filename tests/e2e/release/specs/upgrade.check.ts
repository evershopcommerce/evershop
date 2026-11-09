// Upgrade checks: run only on an upgraded store, BEFORE the main suite (the
// harness restarts the store between the two, which also resets the login
// rate limit). They read what the previous release created (legacy.json,
// written by lib/seedLegacy.mjs) and prove it survived the upgrade.
import fs from 'node:fs';
import { expect, test } from '../support/test';
import { KNOWN_BUGS } from '../support/knownBugs';
import { releaseStore } from '../support/store';

interface Legacy {
  version: string;
  storeName: string;
  category: { name: string; url_key: string };
  product: { name: string; sku: string; url_key: string; price: number };
  customer: { email: string; password: string; full_name: string };
  orders: Record<
    'customer' | 'guest',
    { uuid: string; order_number: string; grand_total: string; email: string }
  >;
}

function legacy(): Legacy {
  const file = releaseStore().legacyFile;
  if (!file || !fs.existsSync(file))
    throw new Error(
      'no legacy.json: this check runs only in an upgrade scenario'
    );
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Legacy;
}

const money = (n: number | string) => Number(n).toFixed(2);

test.describe.serial('upgrade', () => {
  test('R-UPD-01 Settings made before the upgrade are kept', async ({
    adminPage
  }) => {
    const l = legacy();
    await adminPage.goto('/admin/setting/store');
    await expect(adminPage.locator('input[name="storeName"]')).toHaveValue(
      l.storeName
    );
  });

  test('R-UPD-02 The old product and category pages still answer at their old addresses', async ({
    page
  }) => {
    const l = legacy();
    const res = await page.goto(`/${l.product.url_key}`);
    expect(res?.status(), `/${l.product.url_key}`).toBe(200);
    await expect(
      page.getByRole('heading', { name: l.product.name })
    ).toBeVisible();
    await expect(page.getByText(money(l.product.price)).first()).toBeVisible();
    const cat = await page.goto(`/${l.category.url_key}`);
    expect(cat?.status(), `/${l.category.url_key}`).toBe(200);
    await expect(page.getByText(l.product.name).first()).toBeVisible();
  });

  test('R-UPD-03 The old customer signs in with the password set before the upgrade and sees the old order', async ({
    page
  }) => {
    const l = legacy();
    await page.goto('/account/login');
    await page.locator('input[name="email"]').fill(l.customer.email);
    await page.locator('input[name="password"]').fill(l.customer.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/account/login'));
    await page.goto('/account');
    await expect(
      page.getByText(`#${l.orders.customer.order_number}`).first()
    ).toBeVisible();
  });

  test.describe('R-UPD-04', () => {
    // The admin order page has the nested-button bug; the data is what this checks.
    test.use({ allowedErrors: [KNOWN_BUGS.nestedButtonHydration.message] });
    test('R-UPD-04 The admin opens the old orders with their totals and the converted address', async ({
      adminPage
    }) => {
      const l = legacy();
      for (const order of [l.orders.customer, l.orders.guest]) {
        const res = await adminPage.goto(`/admin/order/edit/${order.uuid}`);
        expect(res?.status(), `order #${order.order_number}`).toBe(200);
        await expect(
          adminPage.getByText(`#${order.order_number}`).first()
        ).toBeVisible();
        await expect(
          adminPage.getByText(money(order.grand_total)).first()
        ).toBeVisible();
        await expect(
          adminPage.getByText('Mountain View, California 94043').first(),
          'the address renders after the column renames'
        ).toBeVisible();
      }
    });
  });

  test('R-UPD-05 The admin grids list the old customer, product and category', async ({
    adminPage
  }) => {
    const l = legacy();
    await adminPage.goto(
      `/admin/customers?keyword=${encodeURIComponent(l.customer.email)}`
    );
    await expect(adminPage.getByText(l.customer.email).first()).toBeVisible();
    await adminPage.goto(
      `/admin/products?keyword=${
        encodeURIComponent(
          l.product.name
        ) /* full-text over name + description, not SKU */
      }`
    );
    await expect(adminPage.getByText(l.product.name).first()).toBeVisible();
    await adminPage.goto(
      `/admin/categories?name=${encodeURIComponent(l.category.name)}`
    );
    await expect(adminPage.getByText(l.category.name).first()).toBeVisible();
  });
});

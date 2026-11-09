// The store is up: every main page answers and renders without a browser
// error or a 5xx. Runs on an empty fresh store and on an upgraded one.
import { expect, test } from '../support/test';

const STOREFRONT_PAGES: [string, string][] = [
  ['/', 'home page'],
  ['/products', 'all products page'],
  ['/search?keyword=shirt', 'search results'],
  ['/cart', 'cart'],
  ['/account/login', 'customer login'],
  ['/account/register', 'customer registration']
];

const ADMIN_PAGES: [string, string][] = [
  ['/admin', 'dashboard'],
  ['/admin/products', 'products'],
  ['/admin/products/new', 'new product form'],
  ['/admin/categories', 'categories'],
  ['/admin/attributes', 'attributes'],
  ['/admin/collections', 'collections'],
  ['/admin/orders', 'orders'],
  ['/admin/customers', 'customers'],
  ['/admin/coupons', 'coupons'],
  ['/admin/pages', 'CMS pages'],
  ['/admin/widgets', 'widgets'],
  ['/admin/blog/posts', 'blog posts'],
  ['/admin/landing-pages', 'landing pages'],
  ['/admin/webhooks', 'webhooks'],
  ['/admin/import', 'import'],
  ['/admin/setting/store', 'store settings'],
  ['/admin/setting/catalog', 'catalog settings'],
  ['/admin/setting/customer', 'customer settings'],
  ['/admin/setting/payments', 'payment settings'],
  ['/admin/setting/shipping', 'shipping settings'],
  ['/admin/setting/tax', 'tax settings'],
  ['/admin/setting/system', 'system settings']
];

test('R-SMK-01 Storefront pages answer and render', async ({ page }) => {
  for (const [url, what] of STOREFRONT_PAGES) {
    const res = await page.goto(url);
    expect(res?.status(), `${what} (${url})`).toBe(200);
    await expect(
      page.locator('body'),
      `${what} (${url}) renders`
    ).not.toBeEmpty();
  }
});

test('R-SMK-02 Admin pages answer and render', async ({ adminPage }) => {
  for (const [url, what] of ADMIN_PAGES) {
    const res = await adminPage.goto(url);
    expect(res?.status(), `${what} (${url})`).toBe(200);
    await expect(
      adminPage,
      `${what} (${url}) did not send us back to the login`
    ).not.toHaveURL(/\/admin\/login/);
  }
});

test.describe('R-SMK-03', () => {
  test.use({ allowedErrors: [/status of 404/] });
  test('R-SMK-03 An unknown address shows the not-found page with a 404', async ({
    page
  }) => {
    const res = await page.goto('/no-such-page-release-check');
    expect(res?.status()).toBe(404);
  });
});

test('R-SMK-04 The admin is closed to visitors', async ({ page, request }) => {
  await page.goto('/admin/products');
  await expect(page).toHaveURL(/\/admin\/login/);
  const api = await request.get('/api/orders');
  expect([401, 403, 404]).toContain(api.status());
});

test('R-SMK-05 robots.txt and the sitemap answer', async ({ request }) => {
  expect((await request.get('/robots.txt')).status()).toBe(200);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toMatch(/<(urlset|sitemapindex)/);
});

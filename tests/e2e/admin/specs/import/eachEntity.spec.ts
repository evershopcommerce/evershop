import { test, expect } from '@playwright/test';
import {
  addressCount,
  categoryRow,
  customerRow,
  E2E_EMAIL_DOMAIN,
  jobsByFile,
  productRow,
  referenceNames,
  sweepImportWorld
} from '../../../shared/importDb.js';
import {
  startAndWaitForDone,
  uploadFile,
  viewText,
  waitForChecked,
  writeCsv
} from '../../../shared/importPage.js';

/**
 * The happy path of each type, in the documented order (spec § 11.4): categories,
 * products, customers, addresses. Each file is uploaded, checked, started and
 * read back from the database; then the same file again gives updates, not
 * duplicates, and a blank cell leaves the value as it was.
 */
test.describe.configure({ mode: 'serial', timeout: 180_000 });

const email = (name: string) => `${name}@${E2E_EMAIL_DOMAIN}`;

test.beforeAll(sweepImportWorld);
test.afterAll(sweepImportWorld);

test('categories: a tree is created, the parent first', async ({ page }, info) => {
  const dir = info.outputPath('files');
  const file = writeCsv(dir, 'e2e-imp-categories.csv', [
    ['url_key', 'name', 'parent', 'status', 'position', 'description'],
    ['e2e-imp-shoes', 'E2E Shoes', '', '1', '1', 'All the shoes'],
    // the child is before its parent in the file: the order of the file does not matter
    ['e2e-imp-boots', 'E2E Boots', 'e2e-imp-shoes', '1', '1', ''],
    ['e2e-imp-sandals', 'E2E Sandals', 'e2e-imp-shoes', '0', '2', '']
  ]);
  await uploadFile(page, 'Categories', file);
  await waitForChecked(page);
  await expect(page.getByText('All 3 rows are valid: 3 to create, 0 to update, 0 warnings.')).toBeVisible();
  await startAndWaitForDone(page);
  await expect(page.getByText('Created 3 - Updated 0 - Failed 0 - Skipped 0')).toBeVisible();

  const shoes = await categoryRow('e2e-imp-shoes');
  const boots = await categoryRow('e2e-imp-boots');
  const sandals = await categoryRow('e2e-imp-sandals');
  expect(shoes).toMatchObject({ name: 'E2E Shoes', parent_id: null, status: true });
  expect(boots?.parent_id).toBe(shoes?.category_id);
  expect(sandals).toMatchObject({ parent_id: shoes?.category_id, status: false });
});

test('categories: the same file again updates, and a blank cell leaves the value as it was', async ({ page }, info) => {
  const dir = info.outputPath('files');
  const file = writeCsv(dir, 'e2e-imp-categories-again.csv', [
    ['url_key', 'name', 'parent', 'status', 'position', 'description'],
    // the description is blank: the stored one stays; the name changes
    ['e2e-imp-shoes', 'E2E Shoes, renamed', '', '1', '1', ''],
    ['e2e-imp-boots', 'E2E Boots', 'e2e-imp-shoes', '1', '1', '']
  ]);
  await uploadFile(page, 'Categories', file);
  await waitForChecked(page);
  await expect(page.getByText('All 2 rows are valid: 0 to create, 2 to update, 0 warnings.')).toBeVisible();
  await startAndWaitForDone(page);
  await expect(page.getByText('Created 0 - Updated 2 - Failed 0 - Skipped 0')).toBeVisible();

  const shoes = await categoryRow('e2e-imp-shoes');
  expect(shoes?.name).toBe('E2E Shoes, renamed');
  expect(JSON.stringify(shoes?.description)).toContain('All the shoes');
  // no duplicates
  const { rows } = await (await import('../../../shared/db.js')).getDb().query(
    `SELECT count(*)::int AS n FROM category_description WHERE url_key LIKE 'e2e-imp-%'`
  );
  expect(rows[0].n).toBe(3);
});

test('products: a simple product and a virtual one, with a price and a category', async ({ page }, info) => {
  const { group, taxClass } = await referenceNames();
  const dir = info.outputPath('files');
  const header = [
    'sku', 'name', 'url_key', 'status', 'visibility', 'price', 'qty', 'attribute_group',
    'no_shipping_required', 'manage_stock', 'stock_availability', 'tax_class', 'category'
  ];
  const file = writeCsv(dir, 'e2e-imp-products.csv', [
    header,
    ['E2E-IMP-1', 'E2E Product One', 'e2e-imp-product-one', '1', '1', '19.99', '10', group, '1', '1', '1', taxClass ?? '', 'e2e-imp-shoes'],
    ['E2E-IMP-2', 'E2E Product Two', 'e2e-imp-product-two', '1', '1', '5.00', '0', group, '1', '0', '1', taxClass ?? '', '']
  ]);
  await uploadFile(page, 'Products', file);
  await waitForChecked(page);
  await expect(page.getByText(/All 2 rows are valid: 2 to create, 0 to update/)).toBeVisible();
  await startAndWaitForDone(page);
  await expect(page.getByText('Created 2 - Updated 0 - Failed 0 - Skipped 0')).toBeVisible();
  expect(Number((await productRow('E2E-IMP-1'))?.price)).toBeCloseTo(19.99);
  expect(Number((await productRow('E2E-IMP-2'))?.price)).toBeCloseTo(5);
  // the product page is made by the store after the import
  await expect(page.getByText(/The web addresses \(links\) of the items you imported are still being set up/)).toBeVisible();
});

test('customers: created with a group, no welcome e-mail needed, and again as updates', async ({ page }, info) => {
  const dir = info.outputPath('files');
  const file = writeCsv(dir, 'e2e-imp-customers.csv', [
    ['email', 'full_name', 'status', 'group', 'password_hash', 'password'],
    [email('jane'), 'Jane E2E', '1', '', '', ''],
    [email('omar'), 'Omar E2E', '1', '', '', '']
  ]);
  await uploadFile(page, 'Customers', file);
  await waitForChecked(page);
  await expect(page.getByText(/All 2 rows are valid: 2 to create/)).toBeVisible();
  await startAndWaitForDone(page);
  await expect(page.getByText('Created 2 - Updated 0 - Failed 0 - Skipped 0')).toBeVisible();
  expect((await customerRow(email('jane')))?.full_name).toBe('Jane E2E');

  const again = writeCsv(dir, 'e2e-imp-customers-again.csv', [
    ['email', 'full_name', 'status', 'group', 'password_hash', 'password'],
    [email('jane'), 'Jane E2E Renamed', '1', '', '', '']
  ]);
  await uploadFile(page, 'Customers', again);
  await waitForChecked(page);
  await expect(page.getByText(/1 to update/)).toBeVisible();
  await startAndWaitForDone(page);
  expect((await customerRow(email('jane')))?.full_name).toBe('Jane E2E Renamed');
});

test('customer addresses: added, and added again when the file is imported again (D-18)', async ({ page }, info) => {
  const dir = info.outputPath('files');
  const header = [
    'email', 'recipient', 'organization', 'address_line_1', 'address_line_2', 'address_line_3',
    'locality', 'dependent_locality', 'administrative_area', 'postal_code', 'sorting_code',
    'country', 'telephone', 'extra', 'is_default'
  ];
  const row = [
    email('jane'), 'Jane E2E', '', '1 Market Street', 'Suite 200', '', 'San Francisco', '',
    'US-CA', '94105', '', 'US', '415-555-0100', '', '1'
  ];
  const first = writeCsv(dir, 'e2e-imp-addresses.csv', [header, row]);
  await uploadFile(page, 'Customer addresses', first);
  await waitForChecked(page);
  await startAndWaitForDone(page);
  await expect(page.getByText('Created 1 - Updated 0 - Failed 0 - Skipped 0')).toBeVisible();
  expect(await addressCount(email('jane'))).toBe(1);

  const second = writeCsv(dir, 'e2e-imp-addresses-again.csv', [header, row]);
  await uploadFile(page, 'Customer addresses', second);
  await waitForChecked(page);
  await startAndWaitForDone(page);
  expect(await addressCount(email('jane'))).toBe(2);
  // the page does not offer a mode for addresses
  expect((await jobsByFile('e2e-imp-addresses-again.csv'))[0].status).toBe('completed');
  expect(await viewText(page)).not.toContain('Create and update');
});

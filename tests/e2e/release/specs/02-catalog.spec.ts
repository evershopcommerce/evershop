// Catalog: an attribute, a category and a product made through the admin, then
// seen on the storefront. The tests share their records (serial), never data
// of another spec file, and assume no counts, so they run on an empty fresh
// store and on an upgraded one.
import type { Page } from '@playwright/test';
import { expect, test } from '../support/test';
import { unique } from '../support/store';
import { KNOWN_BUGS } from '../support/knownBugs';
import {
  adminApi,
  allowed,
  checkRadio,
  radio,
  saveForm,
  signInAsAdmin,
  solidPng,
  storefrontGraphql
} from '../support/catalog';
import { chooseOption, hydrated } from '../support/customer';

/**
 * Found by R-CAT-11, not fixed yet (candidate for support/knownBugs.ts): the
 * block editor (components/common/form/Editor.tsx) seeds its first row with a
 * `uuidv4()` id inside `useState`, so the server and the browser make
 * different ids; hydration keeps the server's `<div id>` and Editor.js looks
 * for the browser's one. It throws on every new form whose hydration succeeds
 * (/admin/categories/new, /admin/pages/new, /admin/blog/posts/new) and the
 * description editor never starts. /admin/products/new hides it because its
 * own hydration error (#418) re-renders the page on the client.
 */
const EDITOR_HOLDER_MISSING = KNOWN_BUGS.editorHolderMissing.message;

const suffix = unique('c').slice(2).toLowerCase();
const attribute = {
  name: `RC Finish ${suffix}`,
  code: `rc_finish_${suffix.replace(/-/g, '_')}`,
  options: ['Matte', 'Gloss', 'Satin'],
  optionIds: {} as Record<string, string>
};
const category = {
  name: `RC Category ${suffix}`,
  urlKey: `rc-category-${suffix}`,
  id: 0,
  url: ''
};
const product = {
  name: `RC Tee ${suffix}`,
  sku: `RC-TEE-${suffix}`.toUpperCase(),
  urlKey: `rc-tee-${suffix}`,
  newUrlKey: `rc-tee-renamed-${suffix}`,
  price: 30,
  newPrice: 24.5,
  qty: 25,
  option: 'Matte',
  uuid: '',
  id: 0,
  oldUrl: ''
};
// A second product in the category (REST set-up data) so the filter and the
// sorting have something to tell apart: dearer than the first product, a
// name that sorts before it, another option.
const other = {
  name: `RC Mug ${suffix}`,
  sku: `RC-MUG-${suffix}`.toUpperCase(),
  urlKey: `rc-mug-${suffix}`,
  price: 99,
  option: 'Gloss'
};

/** The names of our two products in the order the listing shows them. */
async function listedOrder(page: Page): Promise<string[]> {
  const names = await page.getByRole('heading', { level: 3 }).allInnerTexts();
  return names
    .map((n) => n.trim())
    .filter((n) => n === product.name || n === other.name);
}

/** Open an admin form and wait for React: a click or a typed value before
 *  hydration can be lost. */
async function openForm(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await hydrated(page.getByRole('button', { name: 'Save', exact: true }));
}

test.describe.serial('R-CAT catalog', () => {
  test('R-CAT-01 Create a select attribute with options, filterable and shown on the storefront', async ({
    adminPage: page
  }) => {
    await openForm(page, '/admin/attributes/new');
    await page.locator('input[name="attribute_name"]').fill(attribute.name);
    await page.locator('input[name="attribute_code"]').fill(attribute.code);
    await checkRadio(page, 'type', 'select');
    // Not required: a required attribute in the Default group would block
    // every product other specs create.
    await checkRadio(page, 'is_required', 0);
    await checkRadio(page, 'is_filterable', 1);
    await checkRadio(page, 'display_on_frontend', 1);
    await page.locator('input[name="sort_order"]').fill('0');
    // The group picker is a react-select.
    await page.locator('input[id^="react-select"][role="combobox"]').click();
    await page.getByRole('option', { name: 'Default', exact: true }).click();

    await saveForm(page, 'POST', /^\/api\/attributes$/);
    await page.waitForURL(/\/admin\/attributes\/edit\//);

    // The options section shows once the attribute is a select.
    await hydrated(page.getByRole('button', { name: 'Add option' }));
    for (const [i, text] of attribute.options.entries()) {
      await page.getByRole('button', { name: 'Add option' }).click();
      await page.locator(`input[name="options.${i}.option_text"]`).fill(text);
    }
    await saveForm(page, 'PATCH', /^\/api\/attributes\//);

    await page.reload();
    for (const [i, text] of attribute.options.entries()) {
      await expect(
        page.locator(`input[name="options.${i}.option_text"]`)
      ).toHaveValue(text);
      attribute.optionIds[text] = await page
        .locator(`input[name="options.${i}.option_id"]`)
        .inputValue();
    }
    await expect(radio(page, 'is_filterable', 1)).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await expect(radio(page, 'display_on_frontend', 1)).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await expect(radio(page, 'is_required', 0)).toHaveAttribute(
      'aria-checked',
      'true'
    );
    await expect(page.getByText('Default', { exact: true })).toBeVisible();
  });

  test.describe(() => {
    // Passes through two known bugs: the description editor of the new form
    // (EDITOR_HOLDER_MISSING, a page error, so this test uses `page` with the
    // admin session: `adminPage` ignores allowedErrors for page errors) and
    // the nested <button> of the edit page's "Add Products" dialog
    // (catalog/pages/admin/categoryEdit/Products.tsx:148).
    test.use({
      allowedErrors: allowed(
        EDITOR_HOLDER_MISSING,
        KNOWN_BUGS.nestedButtonHydration.message
      )
    });

    test('R-CAT-02 Create an enabled category that shows its products', async ({
      page
    }) => {
      await signInAsAdmin(page);
      await openForm(page, '/admin/categories/new');
      await page.locator('input[name="name"]').fill(category.name);
      await page.locator('input[name="url_key"]').fill(category.urlKey);
      await page.locator('input[name="meta_title"]').fill(category.name);
      await page
        .locator('textarea[name="meta_description"]')
        .fill(`${category.name} for the release check`);
      await checkRadio(page, 'status', 1);
      await checkRadio(page, 'show_products', 1);

      const created = await saveForm(page, 'POST', /^\/api\/categories$/);
      category.id = created.data.category_id;
      expect(category.id, 'the API answers the new category id').toBeTruthy();
      await page.waitForURL(/\/admin\/categories\/edit\//);
      await expect(page.locator('input[name="name"]')).toHaveValue(
        category.name
      );
      await expect(page.locator('input[name="url_key"]')).toHaveValue(
        category.urlKey
      );
      await expect(radio(page, 'status', 1)).toHaveAttribute(
        'aria-checked',
        'true'
      );
      await expect(radio(page, 'show_products', 1)).toHaveAttribute(
        'aria-checked',
        'true'
      );

      await page.goto(
        `/admin/categories?keyword=${encodeURIComponent(category.name)}`
      );
      await expect(
        page.getByRole('link', { name: category.name, exact: true })
      ).toBeVisible();
    });
  });

  test.describe(() => {
    // The product form logs a known hydration error (nested <button>).
    test.use({
      allowedErrors: allowed(KNOWN_BUGS.nestedButtonHydration.message)
    });

    test('R-CAT-03 Create a simple product with stock, the attribute option and an image', async ({
      adminPage: page
    }) => {
      await openForm(page, '/admin/products/new');
      await page.locator('input[name="name"]').fill(product.name);
      await page.locator('input[name="sku"]').fill(product.sku);
      await page.locator('input[name="price"]').fill(String(product.price));

      await page.getByRole('button', { name: 'Select category' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByPlaceholder('Search categories').fill(category.name);
      const row = dialog
        .locator('div')
        .filter({ hasText: category.name })
        .filter({
          has: page.getByRole('button', { name: 'Select', exact: true })
        })
        .last();
      await row.getByRole('button', { name: 'Select', exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(
        page.getByText(category.name, { exact: true })
      ).toBeVisible();

      await chooseOption(
        page,
        page.getByRole('combobox', { name: /Tax Class/ }),
        'Taxable Goods'
      );

      // The image: a PNG made here, through the uploader's file input.
      const [upload] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/api/images/') && r.request().method() === 'POST'
        ),
        page
          .locator('#image-uploader-wrapper input[type="file"]')
          .setInputFiles({
            name: `${product.urlKey}.png`,
            mimeType: 'image/png',
            buffer: solidPng(64, [200, 40, 40])
          })
      ]);
      expect(
        upload.ok(),
        `image upload answered ${upload.status()}`
      ).toBeTruthy();
      await expect(page.locator('#image-uploader-wrapper img')).toHaveCount(1);

      await page.locator('input[name="url_key"]').fill(product.urlKey);
      await page.locator('input[name="meta_title"]').fill(product.name);

      await checkRadio(page, 'status', 1);
      await checkRadio(page, 'visibility', 1);
      await checkRadio(page, 'manage_stock', 1);
      await checkRadio(page, 'stock_availability', 1);
      await page.locator('input[name="qty"]').fill(String(product.qty));
      await page.locator('input[name="weight"]').fill('0.5');

      await chooseOption(
        page,
        page.getByRole('combobox', { name: 'Attribute group' }),
        'Default'
      );
      await chooseOption(
        page,
        page.getByRole('combobox', { name: attribute.name }),
        product.option
      );

      const created = await saveForm(page, 'POST', /^\/api\/products$/);
      product.uuid = created.data.uuid;
      product.id = created.data.product_id;
      expect(product.id, 'the API answers the new product id').toBeTruthy();
      await page.waitForURL(/\/admin\/products\/edit\//);

      // What was saved comes back in the edit form.
      await expect(page.locator('input[name="name"]')).toHaveValue(
        product.name
      );
      await expect(page.locator('input[name="sku"]')).toHaveValue(product.sku);
      await expect(page.locator('input[name="qty"]')).toHaveValue(
        String(product.qty)
      );
      await expect(
        page.getByRole('combobox', { name: attribute.name })
      ).toContainText(product.option);
      await expect(page.locator('#image-uploader-wrapper img')).toHaveCount(1);

      // The admin product grid lists it.
      await page.goto(
        `/admin/products?keyword=${encodeURIComponent(product.name)}`
      );
      await expect(
        page.getByRole('link', { name: product.name, exact: true })
      ).toBeVisible();

      // Its storefront address before the rename (R-CAT-06 checks it later).
      const data = await storefrontGraphql(
        page,
        `query { product(id: ${product.id}) { url } }`
      );
      product.oldUrl = new URL(data.product.url, 'http://x').pathname;
      expect(product.oldUrl).toContain(product.urlKey);
    });

    test('R-CAT-04 Update the price and the URL key; the admin shows the new values after a reload', async ({
      adminPage: page
    }) => {
      await openForm(page, `/admin/products/edit/${product.uuid}`);
      const price = page.locator('input[name="price"]');
      const urlKey = page.locator('input[name="url_key"]');
      await expect(price).toHaveValue(String(product.price));
      await expect(urlKey).toHaveValue(product.urlKey);
      await price.fill(String(product.newPrice));
      await urlKey.fill(product.newUrlKey);
      await saveForm(page, 'PATCH', /^\/api\/products\//);
      await expect(
        page.getByText('Product updated successfully')
      ).toBeVisible();

      await page.reload();
      await expect(price).toHaveValue(String(product.newPrice));
      await expect(urlKey).toHaveValue(product.newUrlKey);
      await expect(page.locator('input[name="name"]')).toHaveValue(
        product.name
      );
      await expect(
        page.getByRole('combobox', { name: attribute.name })
      ).toContainText(product.option);
    });
  });

  test('R-CAT-05 The storefront category page lists the product with its new price; the attribute filter and the sorting work', async ({
    page,
    adminPage
  }) => {
    await adminApi(adminPage, 'POST', '/api/products', {
      name: other.name,
      sku: other.sku,
      url_key: other.urlKey,
      meta_title: other.name,
      price: other.price,
      qty: 10,
      manage_stock: 1,
      stock_availability: 1,
      status: 1,
      visibility: 1,
      group_id: 1,
      category_id: category.id,
      no_shipping_required: true,
      attributes: [
        {
          attribute_code: attribute.code,
          value: attribute.optionIds[other.option]
        }
      ],
      description: []
    });

    const data = await storefrontGraphql(
      page,
      `query { category(id: ${category.id}) { url } }`
    );
    category.url = new URL(data.category.url, 'http://x').pathname;
    const res = await page.goto(category.url);
    expect(res?.status(), `category page ${category.url}`).toBe(200);
    await expect(
      page.getByRole('heading', { name: category.name, level: 1 })
    ).toBeVisible();

    const first = page
      .getByRole('link', { name: new RegExp(product.name) })
      .first();
    const second = page
      .getByRole('link', { name: new RegExp(other.name) })
      .first();
    await expect(first).toBeVisible();
    await expect(second).toBeVisible();
    await expect(first).toContainText('24.50');
    await expect(first).not.toContainText('30.00');

    // The attribute filter: our option narrows the list to the first product.
    const filter = page
      .locator('.attribute__filter__section')
      .filter({ has: page.getByRole('heading', { name: attribute.name }) });
    await (
      await hydrated(filter.getByRole('checkbox', { name: product.option }))
    ).click();
    await expect(page).toHaveURL(new RegExp(`[?&]${attribute.code}\\b`));
    await expect(second).toBeHidden();
    await expect(first).toBeVisible();
    // And back: clearing it shows both again.
    await filter.getByRole('checkbox', { name: product.option }).click();
    await expect(second).toBeVisible();
    await expect(first).toBeVisible();

    // Sorting. Choosing a column keeps the direction the arrow shows (the
    // default listing is newest first, so it may stay descending): read the
    // direction from the address and check the rows follow it.
    const sorting = page.locator('.product-sorting');
    const direction = sorting.getByRole('button', {
      name: /^Sort (descending|ascending)$/
    });
    const sortedBy = async (column: 'price' | 'name') => {
      await expect(page).toHaveURL(new RegExp(`[?&]ob=${column}`));
      const desc = new URL(page.url()).searchParams.get('od') === 'desc';
      // Ascending: by price the first product (24.50) comes first, by name
      // "RC Mug" comes before "RC Tee".
      const asc =
        column === 'price'
          ? [product.name, other.name]
          : [other.name, product.name];
      await expect
        .poll(
          () => listedOrder(page),
          `sorted by ${column} ${desc ? 'desc' : 'asc'}`
        )
        .toEqual(desc ? [...asc].reverse() : asc);
    };
    await chooseOption(
      page,
      await hydrated(sorting.getByRole('combobox')),
      'Price'
    );
    await sortedBy('price');
    const before = new URL(page.url()).searchParams.get('od');
    await direction.click();
    await expect
      .poll(
        () => new URL(page.url()).searchParams.get('od'),
        'the arrow flips the direction'
      )
      .not.toBe(before);
    await sortedBy('price');
    await chooseOption(page, sorting.getByRole('combobox'), 'Name');
    await sortedBy('name');
  });

  test('R-CAT-06 The product page shows name, price, image, the attribute and an enabled Add to cart; the old URL key redirects to it', async ({
    page
  }) => {
    const data = await storefrontGraphql(
      page,
      `query { product(id: ${product.id}) { url } }`
    );
    const newUrl = new URL(data.product.url, 'http://x').pathname;
    expect(newUrl).toContain(product.newUrlKey);

    const res = await page.goto(newUrl);
    expect(res?.status(), `product page ${newUrl}`).toBe(200);
    await expect(
      page.getByRole('heading', { name: product.name, level: 1 })
    ).toBeVisible();
    await expect(page.locator('.product__single__price')).toContainText(
      '24.50'
    );
    const image = page.locator(`img[src*="${product.urlKey}"]`).first();
    await expect(image).toBeVisible();
    await expect
      .poll(() =>
        image.evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0
        )
      )
      .toBe(true);
    const attributes = page.locator('.product__single__attributes');
    await expect(
      attributes.getByText(attribute.name, { exact: true })
    ).toBeVisible();
    await expect(
      attributes.getByText(product.option, { exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Add to cart' })
    ).toBeEnabled();

    // The address from before the rename does not 404: the store records a
    // redirect to the new one (base/pages/frontStore/all/redirect.ts).
    expect(product.oldUrl, 'R-CAT-03 recorded the old address').toBeTruthy();
    expect(product.oldUrl).not.toBe(newUrl);
    const old = await page.goto(product.oldUrl);
    expect(old?.status(), `old address ${product.oldUrl}`).toBe(200);
    expect(
      new URL(page.url()).pathname,
      'the old address redirects to the new one'
    ).toBe(newUrl);
    await expect(
      page.getByRole('heading', { name: product.name, level: 1 })
    ).toBeVisible();
  });

  test('R-CAT-07 Search finds the product, and the all-products page lists it', async ({
    page
  }) => {
    await page.goto('/');
    await (
      await hydrated(page.getByRole('link', { name: 'Search', exact: true }))
    ).click();
    const box = page.getByPlaceholder('Search');
    await box.fill(product.name);
    await box.press('Enter');
    await page.waitForURL(/\/search\?keyword=/);
    await expect(
      page.getByRole('link', { name: new RegExp(product.name) }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: new RegExp(other.name) })
    ).toHaveCount(0);

    const res = await page.goto('/products');
    expect(res?.status()).toBe(200);
    await expect(
      page.getByRole('link', { name: new RegExp(product.name) }).first()
    ).toBeVisible();
  });

  test.describe(() => {
    test.use({
      allowedErrors: allowed(KNOWN_BUGS.nestedButtonHydration.message)
    });

    test('R-CAT-08 A variant of the product (by the select attribute) is made in the admin and chosen on the product page', async ({
      adminPage,
      page
    }) => {
      // Lower-case SKU on purpose: an upper-case one hits the bug R-CAT-09 checks.
      const variantSku = `${product.sku}-g`.toLowerCase();
      await openForm(adminPage, `/admin/products/edit/${product.uuid}`);
      await adminPage
        .getByRole('button', { name: 'Create a variant group' })
        .click();
      await adminPage
        .locator('label')
        .filter({ hasText: attribute.name })
        .getByRole('checkbox')
        .click();
      const [group] = await Promise.all([
        adminPage.waitForResponse(
          (r) =>
            r.url().includes('/api/variantGroups') &&
            r.request().method() === 'POST' &&
            r.url().includes('/items')
        ),
        adminPage.getByRole('button', { name: 'Create', exact: true }).click()
      ]);
      expect(
        group.ok(),
        `adding the product to the new variant group answered ${group.status()}`
      ).toBeTruthy();

      await addVariant(adminPage, other.option, variantSku);

      // The product page offers both options and switches to the variant.
      const data = await storefrontGraphql(
        page,
        `query { product(id: ${product.id}) { url } }`
      );
      await page.goto(new URL(data.product.url, 'http://x').pathname);
      const options = page.locator('.variant-option-list');
      const matte = options.getByRole('button', {
        name: product.option,
        exact: true
      });
      const gloss = options.getByRole('button', {
        name: other.option,
        exact: true
      });
      await expect(matte).toBeVisible();
      await expect(await hydrated(gloss)).toBeEnabled();
      const details = page.locator('.product__single__attributes');
      await expect(details).toContainText(product.sku);
      await gloss.click();
      await expect(page).toHaveURL(
        new RegExp(`[?&]${attribute.code}=${attribute.optionIds[other.option]}`)
      );
      await expect(details).toContainText(variantSku);
      await expect(
        details.getByText(other.option, { exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Add to cart' })
      ).toBeEnabled();
    });

    test('R-CAT-09 Add Variant accepts an upper-case SKU', async ({
      adminPage
    }) => {
      // VariantModal.tsx builds the variant's url_key as `<url_key>-<sku>`
      // without lower-casing it, and the product schema only takes lower case.
      await openForm(adminPage, `/admin/products/edit/${product.uuid}`);
      await addVariant(adminPage, 'Satin', `${product.sku}-S`);
    });
  });
});

/** On a product edit page whose product is in a variant group: Add Variant. */
async function addVariant(
  page: Page,
  option: string,
  sku: string
): Promise<void> {
  // .first(): the dialog trigger wraps a second <button> (the known
  // nested-button bug, productEdit/variants/CreateVariant.tsx).
  await page.getByRole('button', { name: 'Add Variant' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'New Variant' })
  ).toBeVisible();
  await chooseOption(
    page,
    dialog.getByRole('combobox', { name: attribute.name }),
    option
  );
  await dialog.locator('input[name="variant_sku"]').fill(sku);
  await dialog.locator('input[name="variant_qty"]').fill('7');
  for (const name of ['Status', 'Visibility']) {
    const toggle = dialog.getByRole('switch', { name });
    await toggle.click();
    await expect(toggle).toBeChecked();
  }
  const [created] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === '/api/products' &&
        r.request().method() === 'POST'
    ),
    dialog.getByRole('button', { name: 'Save', exact: true }).click()
  ]);
  const body = await created.json();
  expect(
    created.ok(),
    `creating the variant answered ${created.status()}: ${body?.error?.message}`
  ).toBeTruthy();
  await expect(page.getByText('Variant created successfully')).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('cell', { name: sku })).toBeVisible();
}

// Each of these checks one thing the admin gets wrong today (see the report);
// they stand outside the serial group so their failure does not stop it.

test('R-CAT-10 The new-attribute form offers options as soon as Select is chosen', async ({
  adminPage: page
}) => {
  await openForm(page, '/admin/attributes/new');
  await checkRadio(page, 'type', 'select');
  // attributeEdit+attributeNew/General.tsx keeps `type` in a useState that is
  // never updated, so the options section only shows after a save.
  await expect(
    page.getByRole('button', { name: 'Add option' }),
    'the options section of a Select attribute'
  ).toBeVisible();
});

test('R-CAT-11 The description editor of the new-category form starts', async ({
  adminPage: page
}) => {
  await openForm(page, '/admin/categories/new');
  // Fails with EDITOR_HOLDER_MISSING (see the top of this file): the editor
  // never starts, so there is nothing to type the description into.
  const editor = page.locator('.editor [contenteditable="true"]').first();
  await expect(
    editor,
    'the Editor.js text area of the description'
  ).toBeVisible();
  await editor.click();
  await page.keyboard.type('Release check description');
  await expect(editor).toContainText('Release check description');
});

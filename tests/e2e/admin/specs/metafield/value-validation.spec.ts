import { expect, test } from '@playwright/test';
import {
  cleanupOrphanProducts,
  cleanupProductDefinitions,
  createDigitalProduct,
  deleteProduct,
  getProductDefinition,
  getProductMeta,
  seedProductDefinitions,
  setProductMeta,
  type TestProduct
} from '../../../shared/metafieldDb.js';

/**
 * Metafield value inputs on the product edit form.
 *
 * Covers the two things wired in `MetafieldValueInput.tsx` /
 * `MetafieldSection.tsx`:
 *
 *   1. A definition's `required` flag + `validations` are mapped to
 *      react-hook-form `validation` props so the value inputs validate inline:
 *      `required`, `range` → min/max, `size` → min/maxLength, `regexp` → pattern,
 *      and `choices` renders a select.
 *   2. Clicking "Done" calls `trigger(name)` — the row stays open with the
 *      error when invalid, collapses to the preview when valid.
 *
 * Plus regression guards:
 *   - An integer value persists into `meta_data` as a JSON number (not a
 *     string) — the original "must be integer" bug.
 *   - A top-level `required` field is enforced client-side (regression: it was
 *     briefly dropped), while a required sub-field of an *untouched* group never
 *     blocks the save — the server normalizes empties to "unset" and the client
 *     mirrors that.
 *
 * Definitions are seeded for `owner_type='product'` with `e2e_` keys; the
 * specs target rows by `data-testid` so they coexist with whatever else is in
 * the DB. The chosen product's `meta_data` is snapshotted and restored.
 */

const RATING = 'metafields.custom.e2e_rating';
const CODE = 'metafields.custom.e2e_code';
const TEXT = 'metafields.custom.e2e_text';
const REQUIRED = 'metafields.custom.e2e_required';
const PATTERN = 'metafields.custom.e2e_pattern';

let product: TestProduct;

test.describe('admin / product metafield value inputs', () => {
  test.beforeAll(async () => {
    await cleanupOrphanProducts();
    product = await createDigitalProduct();
    await seedProductDefinitions([
      { fieldKey: 'e2e_text', name: 'E2E Text', fieldType: 'short_text' },
      {
        fieldKey: 'e2e_rating',
        name: 'E2E Rating',
        fieldType: 'integer',
        validations: [{ type: 'range', min: 1, max: 10 }]
      },
      {
        fieldKey: 'e2e_code',
        name: 'E2E Code',
        fieldType: 'short_text',
        validations: [{ type: 'size', max: 5 }]
      },
      {
        fieldKey: 'e2e_group',
        name: 'E2E Group',
        fieldType: 'group',
        subFields: [
          { key: 'note', name: 'Note', type: 'short_text', required: true }
        ]
      },
      {
        fieldKey: 'e2e_required',
        name: 'E2E Required',
        fieldType: 'short_text',
        required: true
      },
      {
        fieldKey: 'e2e_pattern',
        name: 'E2E Pattern',
        fieldType: 'short_text',
        validations: [{ type: 'regexp', pattern: '^[A-Z]+$' }]
      },
      {
        fieldKey: 'e2e_choice',
        name: 'E2E Choice',
        fieldType: 'short_text',
        validations: [{ type: 'choices', values: ['New', 'Sale', 'Limited'] }]
      },
      {
        fieldKey: 'e2e_editme',
        name: 'E2E Edit Me',
        fieldType: 'short_text',
        validations: [{ type: 'size', max: 50 }]
      }
    ]);
  });

  test.afterAll(async () => {
    await cleanupProductDefinitions();
    await deleteProduct(product.productId);
  });

  test.beforeEach(async () => {
    // Clean slate per test so assertions on `meta_data` are deterministic.
    await setProductMeta(product.productId, {});
  });

  const editUrl = () => `/admin/products/edit/${product.uuid}`;
  const save = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Save', exact: true }).last();

  // A top-level required field (e2e_required) must be filled for any successful
  // save — call this in tests that expect the save to go through.
  const satisfyRequired = async (page: import('@playwright/test').Page) => {
    await page.getByTestId('mf-preview-e2e_required').scrollIntoViewIfNeeded();
    await page.getByTestId('mf-preview-e2e_required').click();
    await page.locator(`[name="${REQUIRED}"]`).fill('ok');
    await page.getByTestId('mf-done-e2e_required').click();
  };

  test('integer range: out-of-range blocks the save; a valid value persists as a JSON number', async ({
    page
  }) => {
    await page.goto(editUrl());
    await satisfyRequired(page);

    await page.getByTestId('mf-preview-e2e_rating').scrollIntoViewIfNeeded();
    await page.getByTestId('mf-preview-e2e_rating').click();
    const input = page.locator(`[name="${RATING}"]`);
    await input.fill('50');

    // Saving with an out-of-range value is blocked client-side: inline error,
    // no success toast, and meta_data is untouched.
    await save(page).click();
    await expect(
      page.getByTestId('mf-row-e2e_rating').getByRole('alert')
    ).toHaveText(/at most 10/i);
    await expect(page.getByText('Product updated successfully')).toHaveCount(0);
    expect(await getProductMeta(product.productId)).toEqual({});

    // Correcting to a valid value clears the error and saves.
    await input.fill('5');
    await expect(
      page.getByTestId('mf-row-e2e_rating').getByRole('alert')
    ).toHaveCount(0);
    await save(page).click();
    await expect(page.getByText('Product updated successfully')).toBeVisible();

    const meta = await getProductMeta(product.productId);
    expect(meta.custom.e2e_rating).toBe(5);
    expect(typeof meta.custom.e2e_rating).toBe('number');
  });

  test('short_text size(max): over the limit shows an inline error; correcting clears it', async ({
    page
  }) => {
    await page.goto(editUrl());

    await page.getByTestId('mf-preview-e2e_code').scrollIntoViewIfNeeded();
    await page.getByTestId('mf-preview-e2e_code').click();
    const input = page.locator(`[name="${CODE}"]`);

    await input.fill('toolong'); // 7 > 5
    await page.getByTestId('mf-done-e2e_code').click();
    await expect(
      page.getByTestId('mf-row-e2e_code').getByRole('alert')
    ).toHaveText(/at most 5 characters/i);

    // Correcting to a value within the limit and re-validating (Done) clears the
    // error and collapses the row. (The empty-input case — that an untouched
    // optional field is never flagged — is covered by the save test below.)
    await input.fill('ok');
    await page.getByTestId('mf-done-e2e_code').click();
    await expect(
      page.getByTestId('mf-row-e2e_code').getByRole('alert')
    ).toHaveCount(0);
    await expect(page.getByTestId('mf-preview-e2e_code')).toBeVisible();
  });

  test('Done validates the edited field: stays open on error, collapses on valid', async ({
    page
  }) => {
    await page.goto(editUrl());

    await page.getByTestId('mf-preview-e2e_rating').scrollIntoViewIfNeeded();
    await page.getByTestId('mf-preview-e2e_rating').click();
    const input = page.locator(`[name="${RATING}"]`);

    await input.fill('99');
    await page.getByTestId('mf-done-e2e_rating').click();
    // Invalid → editor stays open (Done + input visible), error shown.
    await expect(page.getByTestId('mf-done-e2e_rating')).toBeVisible();
    await expect(input).toBeVisible();
    await expect(
      page.getByTestId('mf-row-e2e_rating').getByRole('alert')
    ).toBeVisible();

    await input.fill('7');
    await page.getByTestId('mf-done-e2e_rating').click();
    // Valid → collapses back to the preview.
    await expect(page.getByTestId('mf-done-e2e_rating')).toBeHidden();
    await expect(page.getByTestId('mf-preview-e2e_rating')).toBeVisible();
  });

  test('empty optional fields (incl. a required sub-field of an untouched group) do not block the save', async ({
    page
  }) => {
    await page.goto(editUrl());
    await satisfyRequired(page);

    // Set only e2e_text; leave e2e_rating, e2e_code and e2e_group (whose `note`
    // sub-field is required) untouched.
    await page.getByTestId('mf-preview-e2e_text').scrollIntoViewIfNeeded();
    await page.getByTestId('mf-preview-e2e_text').click();
    await page.locator(`[name="${TEXT}"]`).fill('hello world');
    await page.getByTestId('mf-done-e2e_text').click();

    await save(page).click();
    await expect(page.getByText('Product updated successfully')).toBeVisible();

    const meta = await getProductMeta(product.productId);
    expect(meta.custom.e2e_text).toBe('hello world');
    // Empty fields were normalized to "unset" — not stored, not blocking.
    expect(meta.custom.e2e_rating).toBeUndefined();
    expect(meta.custom.e2e_group).toBeUndefined();
  });

  test('required (top-level): Done on an empty required field shows the error and keeps the row open; filling clears it', async ({
    page
  }) => {
    await page.goto(editUrl());

    await page.getByTestId('mf-preview-e2e_required').scrollIntoViewIfNeeded();
    await page.getByTestId('mf-preview-e2e_required').click();

    // Empty + Done → inline "is required", editor stays open.
    await page.getByTestId('mf-done-e2e_required').click();
    await expect(
      page.getByTestId('mf-row-e2e_required').getByRole('alert')
    ).toHaveText(/is required/i);
    await expect(page.getByTestId('mf-done-e2e_required')).toBeVisible();

    // Filling a value clears the error and Done collapses the row.
    await page.locator(`[name="${REQUIRED}"]`).fill('present');
    await page.getByTestId('mf-done-e2e_required').click();
    await expect(
      page.getByTestId('mf-row-e2e_required').getByRole('alert')
    ).toHaveCount(0);
    await expect(page.getByTestId('mf-preview-e2e_required')).toBeVisible();
  });

  test('regexp: a value not matching the pattern shows an inline error; a matching one clears it', async ({
    page
  }) => {
    await page.goto(editUrl());

    await page.getByTestId('mf-preview-e2e_pattern').scrollIntoViewIfNeeded();
    await page.getByTestId('mf-preview-e2e_pattern').click();
    const input = page.locator(`[name="${PATTERN}"]`);

    await input.fill('abc123'); // pattern is ^[A-Z]+$
    await page.getByTestId('mf-done-e2e_pattern').click();
    await expect(
      page.getByTestId('mf-row-e2e_pattern').getByRole('alert')
    ).toHaveText(/invalid format/i);

    await input.fill('ABC');
    await page.getByTestId('mf-done-e2e_pattern').click();
    await expect(
      page.getByTestId('mf-row-e2e_pattern').getByRole('alert')
    ).toHaveCount(0);
    await expect(page.getByTestId('mf-preview-e2e_pattern')).toBeVisible();
  });

  test('choices: renders a select and the chosen value shows in the preview', async ({
    page
  }) => {
    await page.goto(editUrl());

    await page.getByTestId('mf-preview-e2e_choice').scrollIntoViewIfNeeded();
    await page.getByTestId('mf-preview-e2e_choice').click();

    // A `choices` rule renders a select (combobox), not a free-text input.
    const row = page.getByTestId('mf-row-e2e_choice');
    await expect(row.getByRole('combobox')).toBeVisible();
    await row.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Sale' }).click();

    await page.getByTestId('mf-done-e2e_choice').click();
    await expect(page.getByTestId('mf-preview-e2e_choice')).toContainText(
      'Sale'
    );
  });

  test('definition editor: the cog opens a prefilled edit dialog (Key read-only); changes persist', async ({
    page
  }) => {
    await page.goto(editUrl());

    // The cog next to the field name opens the definition editor in edit mode.
    await page.getByTestId('mf-settings-e2e_editme').scrollIntoViewIfNeeded();
    await page.getByTestId('mf-settings-e2e_editme').click();
    const dialog = page
      .getByRole('dialog')
      .filter({ hasText: 'Edit custom field' });
    await expect(dialog).toBeVisible();

    // Prefilled with the current name; the immutable Key is read-only.
    await expect(dialog.locator('[name="name"]')).toHaveValue('E2E Edit Me');
    await expect(dialog.locator('[name="fieldKey"]')).toBeDisabled();

    // Rename and update.
    await dialog.locator('[name="name"]').fill('E2E Edited Name');
    await dialog.getByRole('button', { name: 'Update field' }).click();
    await expect(dialog).toBeHidden();

    // Persisted: the row label refreshes and the DB row reflects the new name.
    await expect(page.getByTestId('mf-row-e2e_editme')).toContainText(
      'E2E Edited Name'
    );
    expect((await getProductDefinition('e2e_editme'))?.name).toBe(
      'E2E Edited Name'
    );
  });
});

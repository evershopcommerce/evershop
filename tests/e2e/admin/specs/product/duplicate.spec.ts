import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { getDb } from '../../../shared/db.js';
import {
  cleanupDuplicationArtifacts,
  createDuplicationSource,
  createVariantDuplicationSource,
  type DuplicationSource
} from '../../../shared/productDb.js';

/**
 * Product duplication (see wiki/product-duplication-design.md).
 *
 * The flow under test: the grid's single-select Duplicate action navigates to
 * `productNew?duplicate=<uuid>`; the index middleware sets `productId` (whole
 * form prefills from the source) + `duplicateSourceId` (duplicate-mode marker:
 * "Duplicating …" heading, banner, `-copy`-suffixed sku/url_key, ` (copy)`
 * name, hidden `duplicate_of` field). Saving POSTs to the normal createProduct
 * API; the `duplicateData` middleware then copies the source's collection
 * memberships and the field itself is never persisted.
 *
 * Serial: the collision spec relies on the copy saved by the first spec.
 */

test.describe.configure({ mode: 'serial' });

// Dev-mode webpack compiles each admin route on first visit — first
// navigations can take tens of seconds.
const NAV_TIMEOUT = 90_000;

let source: DuplicationSource;

test.describe('admin / product duplication', () => {
  test.beforeAll(async () => {
    await cleanupDuplicationArtifacts();
    source = await createDuplicationSource();
  });

  test.afterAll(async () => {
    await cleanupDuplicationArtifacts();
  });

  test('grid Duplicate opens a prefilled creation form and saving creates the copy', async ({
    page
  }) => {
    test.setTimeout(240_000);

    // The Duplicate action is single-select: it appears once exactly one row
    // is checked.
    await page.goto(`/admin/products?keyword=${source.tag}`, {
      timeout: NAV_TIMEOUT
    });
    const rowCheckboxes = page.locator('tbody [data-slot="checkbox"]');
    await expect(rowCheckboxes).toHaveCount(1, { timeout: NAV_TIMEOUT });
    await expect(
      page.getByRole('button', { name: 'Duplicate' })
    ).toHaveCount(0);
    await rowCheckboxes.first().click();
    const duplicateButton = page.getByRole('button', { name: 'Duplicate' });
    await expect(duplicateButton).toBeVisible();
    await duplicateButton.click();

    // The creation form, aware it is duplicating.
    await page.waitForURL(`**/admin/products/new?duplicate=${source.uuid}`, {
      timeout: NAV_TIMEOUT
    });
    await expect(page.getByText(`Duplicating ${source.name}`)).toBeVisible({
      timeout: NAV_TIMEOUT
    });
    await expect(
      page.getByText(`You are creating a copy of ${source.name}`)
    ).toBeVisible();
    await expect(
      page.getByText(/Nothing is duplicated yet — hit Save/)
    ).toBeVisible();
    await expect(page.locator('input[name="name"]')).toHaveValue(
      `${source.name} (copy)`
    );
    await expect(page.locator('input[name="sku"]')).toHaveValue(
      `${source.sku}-copy`
    );
    await expect(page.locator('input[name="url_key"]')).toHaveValue(
      `${source.urlKey}-copy`
    );
    await expect(page.locator('input[name="duplicate_of"]')).toHaveValue(
      source.uuid
    );

    // Save → a genuine creation → redirected to the NEW product's edit page.
    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL(/\/admin\/products\/edit\//, {
      timeout: NAV_TIMEOUT
    });

    const db = getDb();
    const { rows: copies } = await db.query(
      `SELECT p.product_id, p.uuid, pd.name, pd.url_key
         FROM product p
         JOIN product_description pd
           ON pd.product_description_product_id = p.product_id
        WHERE p.sku = $1`,
      [`${source.sku}-copy`]
    );
    expect(copies).toHaveLength(1);
    expect(copies[0].name).toBe(`${source.name} (copy)`);
    expect(copies[0].url_key).toBe(`${source.urlKey}-copy`);
    expect(copies[0].uuid).not.toBe(source.uuid);
    // We landed on the copy's edit page, not the source's.
    expect(page.url()).toContain(copies[0].uuid);

    // The duplicateData middleware copied the collection membership...
    const { rows: memberships } = await db.query(
      `SELECT collection_id FROM product_collection WHERE product_id = $1`,
      [copies[0].product_id]
    );
    expect(memberships.map((r) => r.collection_id)).toContain(
      source.collectionId
    );
    // ...and `duplicate_of` was consumed, not persisted (no such column).
    const { rows: cols } = await db.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'product' AND column_name = 'duplicate_of'`
    );
    expect(cols).toHaveLength(0);
  });

  test('duplicating the same product again collides on the suffixed SKU with a friendly error', async ({
    page
  }) => {
    test.setTimeout(240_000);
    await page.goto(`/admin/products/new?duplicate=${source.uuid}`, {
      timeout: NAV_TIMEOUT
    });
    await expect(page.locator('input[name="sku"]')).toHaveValue(
      `${source.sku}-copy`,
      { timeout: NAV_TIMEOUT }
    );
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(
      page.getByText('This SKU is already used by another product')
    ).toBeVisible({ timeout: 30_000 });
  });

  test('an unknown duplicate source falls back to a blank creation form', async ({
    page
  }) => {
    test.setTimeout(240_000);
    await page.goto(`/admin/products/new?duplicate=${randomUUID()}`, {
      timeout: NAV_TIMEOUT
    });
    await expect(page.getByText('Create a new product').first()).toBeVisible({
      timeout: NAV_TIMEOUT
    });
    await expect(page.locator('input[name="sku"]')).toHaveValue('');
    await expect(page.locator('input[name="duplicate_of"]')).toHaveCount(0);
  });

  test('a malformed duplicate source falls back to a blank creation form', async ({
    page
  }) => {
    test.setTimeout(240_000);
    await page.goto('/admin/products/new?duplicate=not-a-uuid', {
      timeout: NAV_TIMEOUT
    });
    await expect(page.getByText('Create a new product').first()).toBeVisible({
      timeout: NAV_TIMEOUT
    });
    await expect(page.locator('input[name="duplicate_of"]')).toHaveCount(0);
  });

  test('edit-screen Duplicate navigates directly when the form is clean', async ({
    page
  }) => {
    test.setTimeout(240_000);
    await page.goto(`/admin/products/edit/${source.uuid}`, {
      timeout: NAV_TIMEOUT
    });
    const duplicateButton = page
      .locator('.page-heading')
      .getByRole('button', { name: 'Duplicate' });
    await expect(duplicateButton).toBeVisible({ timeout: NAV_TIMEOUT });
    // The footer no longer has a Duplicate button — the heading owns it.
    await expect(
      page
        .locator('.form-submit-button')
        .getByRole('button', { name: 'Duplicate' })
    ).toHaveCount(0);
    await duplicateButton.click();
    await page.waitForURL(`**/admin/products/new?duplicate=${source.uuid}`, {
      timeout: NAV_TIMEOUT
    });
    await expect(page.locator('input[name="sku"]')).toHaveValue(
      `${source.sku}-copy`
    );
  });

  test('edit-screen Duplicate warns about unsaved changes and duplicates the saved state', async ({
    page
  }) => {
    test.setTimeout(240_000);
    await page.goto(`/admin/products/edit/${source.uuid}`, {
      timeout: NAV_TIMEOUT
    });
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toHaveValue(source.name, { timeout: NAV_TIMEOUT });
    await nameInput.fill(`${source.name} EDITED`);

    const duplicateButton = page
      .locator('.page-heading')
      .getByRole('button', { name: 'Duplicate' });
    await duplicateButton.click();
    // The Alert modal is aria-hidden (existing quirk), so scope by CSS.
    const dialog = page.locator('.modal-overlay');
    await expect(dialog.getByText('Unsaved changes')).toBeVisible();

    // Cancel keeps the edit page (and the unsaved value) intact.
    await dialog.locator('button', { hasText: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    expect(page.url()).toContain(`/admin/products/edit/${source.uuid}`);
    await expect(nameInput).toHaveValue(`${source.name} EDITED`);

    // Continue proceeds — and the copy prefills from the SAVED name, proving
    // the unsaved edit was not included.
    await duplicateButton.click();
    await page
      .locator('.modal-overlay')
      .locator('button', { hasText: 'Continue without saving' })
      .click();
    await page.waitForURL(`**/admin/products/new?duplicate=${source.uuid}`, {
      timeout: NAV_TIMEOUT
    });
    await expect(page.locator('input[name="name"]')).toHaveValue(
      `${source.name} (copy)`
    );
  });

  test('saving clears the unsaved-changes guard — Duplicate right after Save does not warn', async ({
    page
  }) => {
    test.setTimeout(240_000);
    await page.goto(`/admin/products/edit/${source.uuid}`, {
      timeout: NAV_TIMEOUT
    });
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toHaveValue(source.name, { timeout: NAV_TIMEOUT });
    const savedName = `${source.name} SAVED`;
    await nameInput.fill(savedName);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(
      page.getByText('Product updated successfully')
    ).toBeVisible({ timeout: 30_000 });

    // The save is the new baseline: no modal, straight to the duplicate form,
    // prefilled with the just-saved name.
    await page
      .locator('.page-heading')
      .getByRole('button', { name: 'Duplicate' })
      .click();
    await expect(page.locator('.modal-overlay')).toHaveCount(0);
    await page.waitForURL(`**/admin/products/new?duplicate=${source.uuid}`, {
      timeout: NAV_TIMEOUT
    });
    await expect(page.locator('input[name="name"]')).toHaveValue(
      `${savedName} (copy)`
    );
  });

  test('duplicating a variant-group member creates a STANDALONE copy', async ({
    page
  }) => {
    // Decided 2026-07-07 (after testing the carry-over variant): the creation
    // form has no variant-management section — variants are a post-save
    // workflow — and a carried membership would give the group two members
    // with one option combination. The copy stays standalone.
    test.setTimeout(240_000);
    const variantSource = await createVariantDuplicationSource();
    await page.goto(`/admin/products/new?duplicate=${variantSource.uuid}`, {
      timeout: NAV_TIMEOUT
    });
    await expect(page.locator('input[name="sku"]')).toHaveValue(
      `${variantSource.sku}-copy`,
      { timeout: NAV_TIMEOUT }
    );
    // No variant membership is posted.
    await expect(
      page.locator('input[name="variant_group_id"]')
    ).toHaveCount(0);

    await page.getByRole('button', { name: 'Save' }).click();
    await page.waitForURL(/\/admin\/products\/edit\//, {
      timeout: NAV_TIMEOUT
    });

    const db = getDb();
    const { rows } = await db.query(
      `SELECT variant_group_id FROM product WHERE sku = $1`,
      [`${variantSource.sku}-copy`]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].variant_group_id).toBeNull();
  });
});

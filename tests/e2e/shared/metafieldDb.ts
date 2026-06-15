import { randomUUID } from 'node:crypto';
import { getDb } from './db.js';

/**
 * Metafield e2e test data helpers.
 *
 * Definitions are global per `owner_type` (there is no per-product definition
 * table), so the suite seeds its own definitions for `owner_type='product'`
 * under the default `custom` namespace, with field keys prefixed `e2e_` so
 * cleanup is a single LIKE-delete. The specs target rows by `data-testid`
 * (`mf-row-<key>`, `mf-preview-<key>`, `mf-done-<key>`), so they coexist with
 * any other definitions already present in the DB.
 *
 * Values live in `product.meta_data` (jsonb) — there is no `metafield_value`
 * table. The suite snapshots the chosen product's `meta_data`, resets it per
 * test, and restores the original on teardown, so it never destroys real data.
 */

export const E2E_PREFIX = 'e2e_';

export interface SeedDef {
  fieldKey: string;
  name: string;
  fieldType: string;
  isList?: boolean;
  required?: boolean;
  validations?: unknown[];
  subFields?: unknown[];
}

/**
 * Replace the suite's product definitions with `defs`. Idempotent: clears any
 * leftover `e2e_*` definitions first (a crashed prior run), then inserts.
 */
export async function seedProductDefinitions(defs: SeedDef[]): Promise<void> {
  const db = getDb();
  await cleanupProductDefinitions();
  let position = 0;
  for (const d of defs) {
    await db.query(
      `INSERT INTO metafield_definition
         (owner_type, namespace, field_key, name, field_type,
          is_list, required, validations, sub_fields, position)
       VALUES ('product', 'custom', $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)`,
      [
        d.fieldKey,
        d.name,
        d.fieldType,
        d.isList ?? false,
        d.required ?? false,
        JSON.stringify(d.validations ?? []),
        JSON.stringify(d.subFields ?? []),
        position++
      ]
    );
  }
}

export async function cleanupProductDefinitions(): Promise<void> {
  const db = getDb();
  await db.query(
    `DELETE FROM metafield_definition WHERE owner_type = 'product' AND field_key LIKE $1`,
    [`${E2E_PREFIX}%`]
  );
}

/** Read a product definition back (to assert a definition-editor update landed). */
export async function getProductDefinition(
  fieldKey: string
): Promise<{
  name: string;
  required: boolean;
  validations: unknown;
} | null> {
  const db = getDb();
  const { rows } = await db.query<{
    name: string;
    required: boolean;
    validations: unknown;
  }>(
    `SELECT name, required, validations FROM metafield_definition
      WHERE owner_type = 'product' AND field_key = $1`,
    [fieldKey]
  );
  return rows[0] ?? null;
}

export interface TestProduct {
  productId: number;
  uuid: string;
}

/**
 * Create a dedicated, form-saveable digital product to drive the edit form
 * against. `no_shipping_required = true` so the form's "package required for
 * shippable products" rule doesn't block the save — that's a product-level
 * rule, unrelated to metafields. All FKs referencing `product` are ON DELETE
 * CASCADE, so {@link deleteProduct} cleans up the description/inventory rows.
 */
export async function createDigitalProduct(): Promise<TestProduct> {
  const db = getDb();
  const { rows: groups } = await db.query<{ attribute_group_id: number }>(
    `SELECT attribute_group_id FROM attribute_group ORDER BY attribute_group_id LIMIT 1`
  );
  if (groups.length === 0) {
    throw new Error('No attribute_group found — cannot create a test product.');
  }
  const { rows: taxes } = await db.query<{ tax_class_id: number }>(
    `SELECT tax_class_id FROM tax_class ORDER BY tax_class_id LIMIT 1`
  );
  const taxClass = taxes[0]?.tax_class_id ?? null;

  const tag = `e2e${randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const name = `E2E Metafield Product ${tag}`;
  // Explicit param casts: the surrounding untyped literals otherwise leave PG
  // unable to deduce the bind-parameter types.
  const { rows } = await db.query<{ product_id: number; uuid: string }>(
    `INSERT INTO product
       (sku, price, status, visibility, group_id, weight,
        no_shipping_required, tax_class, meta_data)
     VALUES ($1::varchar, 9.99, true, true, $2::int, 0, true, $3::smallint, '{}'::jsonb)
     RETURNING product_id, uuid`,
    [`E2E-MF-${tag}`, groups[0].attribute_group_id, taxClass]
  );
  const productId = rows[0].product_id;
  await db.query(
    `INSERT INTO product_description
       (product_description_product_id, name, url_key, meta_title)
     VALUES ($1::int, $2::varchar, $3::varchar, $4::varchar)`,
    [productId, name, `e2e-mf-${tag.toLowerCase()}`, name]
  );
  await db.query(
    `INSERT INTO product_inventory
       (product_inventory_product_id, qty, manage_stock, stock_availability)
     VALUES ($1::int, 100, false, true)`,
    [productId]
  );
  return { productId, uuid: rows[0].uuid };
}

/** Hard-delete the test product; child rows cascade via FK. */
export async function deleteProduct(productId: number): Promise<void> {
  const db = getDb();
  await db.query(`DELETE FROM product WHERE product_id = $1`, [productId]);
}

/**
 * Sweep any `E2E-MF-%` products left behind by a crashed/interrupted prior run
 * (Ctrl-C between create and teardown). Cheap and idempotent — call before
 * creating a fresh one. Mirrors the suite's orphaned-admin cleanup.
 */
export async function cleanupOrphanProducts(): Promise<void> {
  const db = getDb();
  await db.query(`DELETE FROM product WHERE sku LIKE 'E2E-MF-%'`);
}

export async function setProductMeta(
  productId: number,
  meta: Record<string, unknown> | null
): Promise<void> {
  const db = getDb();
  await db.query(`UPDATE product SET meta_data = $1::jsonb WHERE product_id = $2`, [
    JSON.stringify(meta ?? {}),
    productId
  ]);
}

export async function getProductMeta(
  productId: number
): Promise<Record<string, any>> {
  const db = getDb();
  const { rows } = await db.query<{ meta_data: Record<string, any> | null }>(
    `SELECT meta_data FROM product WHERE product_id = $1`,
    [productId]
  );
  return rows[0]?.meta_data ?? {};
}

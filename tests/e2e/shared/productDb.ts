import { randomUUID } from 'node:crypto';
import { getDb } from './db.js';

/**
 * Product + collection fixtures for the product-duplication specs.
 *
 * Convention (mirrors metafieldDb.ts): every row this file creates carries an
 * `E2E-DUP` / `e2e-dup` marker in its sku/code so an interrupted run can be
 * swept idempotently by `cleanupDuplicationArtifacts()`. Copies the specs save
 * through the UI get `-copy` suffixed onto the source sku, which still matches
 * the sweep's LIKE pattern.
 */

export interface DuplicationSource {
  productId: number;
  uuid: string;
  sku: string;
  name: string;
  urlKey: string;
  /** The unique token baked into name/sku — usable as a grid keyword. */
  tag: string;
  collectionId: number;
}

export async function createDuplicationSource(): Promise<DuplicationSource> {
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

  const tag = `e2edup${randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const sku = `E2E-DUP-${tag}`;
  const name = `E2E Duplication Source ${tag}`;
  const urlKey = `e2e-dup-${tag.toLowerCase()}`;

  // Digital product (no_shipping_required) so the copy saves without a
  // package. The description must be NON-NULL: the grid's keyword filter
  // tsvectors `name || ' ' || description`, and a NULL description nulls the
  // whole vector — the specs find the row via keyword=<tag>.
  const { rows } = await db.query<{ product_id: number; uuid: string }>(
    `INSERT INTO product
       (sku, price, status, visibility, group_id, weight,
        no_shipping_required, tax_class, meta_data)
     VALUES ($1::varchar, 19.99, true, true, $2::int, 0, true, $3::smallint, '{}'::jsonb)
     RETURNING product_id, uuid`,
    [sku, groups[0].attribute_group_id, taxClass]
  );
  const productId = rows[0].product_id;
  await db.query(
    `INSERT INTO product_description
       (product_description_product_id, name, description, url_key, meta_title)
     VALUES ($1::int, $2::varchar, '[]', $3::varchar, $4::varchar)`,
    [productId, name, urlKey, name]
  );
  await db.query(
    `INSERT INTO product_inventory
       (product_inventory_product_id, qty, manage_stock, stock_availability)
     VALUES ($1::int, 42, false, true)`,
    [productId]
  );

  // A collection membership — the one piece the duplicateData middleware (not
  // the form) must carry to the copy.
  const { rows: colRows } = await db.query<{ collection_id: number }>(
    `INSERT INTO collection (name, code)
     VALUES ($1::varchar, $2::varchar)
     RETURNING collection_id`,
    [`E2E Dup Collection ${tag}`, `e2e-dup-${tag.toLowerCase()}`]
  );
  const collectionId = colRows[0].collection_id;
  await db.query(
    `INSERT INTO product_collection (collection_id, product_id)
     VALUES ($1::int, $2::int)`,
    [collectionId, productId]
  );

  return { productId, uuid: rows[0].uuid, sku, name, urlKey, tag, collectionId };
}

export interface VariantDuplicationSource extends DuplicationSource {
  variantGroupId: number;
}

/**
 * A variant-group member: own attribute group + one select attribute with two
 * options, a variant_group keyed on that attribute, and a product assigned to
 * the group holding the first option's value.
 */
export async function createVariantDuplicationSource(): Promise<VariantDuplicationSource> {
  const db = getDb();
  const tag = `e2edup${randomUUID().replace(/-/g, '').slice(0, 10)}`;

  const { rows: attrs } = await db.query<{ attribute_id: number }>(
    `INSERT INTO attribute (attribute_code, attribute_name, type)
     VALUES ($1::varchar, $2::varchar, 'select')
     RETURNING attribute_id`,
    [`e2e-dup-color-${tag}`, `E2E Dup Color ${tag}`]
  );
  const attributeId = attrs[0].attribute_id;
  const { rows: opts } = await db.query<{ attribute_option_id: number }>(
    `INSERT INTO attribute_option (attribute_id, attribute_code, option_text)
     VALUES ($1::int, $2::varchar, 'Red'), ($1::int, $2::varchar, 'Blue')
     RETURNING attribute_option_id`,
    [attributeId, `e2e-dup-color-${tag}`]
  );
  const redOptionId = opts[0].attribute_option_id;

  const { rows: grps } = await db.query<{ attribute_group_id: number }>(
    `INSERT INTO attribute_group (group_name)
     VALUES ($1::varchar)
     RETURNING attribute_group_id`,
    [`E2E Dup Group ${tag}`]
  );
  const groupId = grps[0].attribute_group_id;
  await db.query(
    `INSERT INTO attribute_group_link (attribute_id, group_id)
     VALUES ($1::int, $2::int)`,
    [attributeId, groupId]
  );

  const { rows: vgs } = await db.query<{ variant_group_id: number }>(
    `INSERT INTO variant_group (attribute_group_id, attribute_one, visibility)
     VALUES ($1::int, $2::int, true)
     RETURNING variant_group_id`,
    [groupId, attributeId]
  );
  const variantGroupId = vgs[0].variant_group_id;

  const sku = `E2E-DUP-${tag}`;
  const name = `E2E Variant Dup Source ${tag}`;
  const urlKey = `e2e-dup-${tag.toLowerCase()}`;
  const { rows: taxes } = await db.query<{ tax_class_id: number }>(
    `SELECT tax_class_id FROM tax_class ORDER BY tax_class_id LIMIT 1`
  );
  const { rows } = await db.query<{ product_id: number; uuid: string }>(
    `INSERT INTO product
       (sku, price, status, visibility, group_id, variant_group_id, weight,
        no_shipping_required, tax_class, meta_data)
     VALUES ($1::varchar, 29.99, true, true, $2::int, $3::int, 0, true,
             $4::smallint, '{}'::jsonb)
     RETURNING product_id, uuid`,
    [sku, groupId, variantGroupId, taxes[0]?.tax_class_id ?? null]
  );
  const productId = rows[0].product_id;
  await db.query(
    `INSERT INTO product_description
       (product_description_product_id, name, description, url_key, meta_title)
     VALUES ($1::int, $2::varchar, '[]', $3::varchar, $4::varchar)`,
    [productId, name, urlKey, name]
  );
  await db.query(
    `INSERT INTO product_inventory
       (product_inventory_product_id, qty, manage_stock, stock_availability)
     VALUES ($1::int, 7, false, true)`,
    [productId]
  );
  await db.query(
    `INSERT INTO product_attribute_value_index
       (product_id, attribute_id, option_id, option_text)
     VALUES ($1::int, $2::int, $3::int, 'Red')`,
    [productId, attributeId, redOptionId]
  );

  return {
    productId,
    uuid: rows[0].uuid,
    sku,
    name,
    urlKey,
    tag,
    collectionId: -1,
    variantGroupId
  };
}

/** Sweep sources, saved copies, and the e2e collections. Idempotent. */
export async function cleanupDuplicationArtifacts(): Promise<void> {
  const db = getDb();
  await db.query(`DELETE FROM product WHERE sku LIKE 'E2E-DUP-%'`);
  await db.query(`DELETE FROM collection WHERE code LIKE 'e2e-dup-%'`);
  // Variant fixtures: deleting the attribute_group cascades the variant_group
  // and the group links; deleting the attribute cascades its options.
  await db.query(
    `DELETE FROM attribute_group WHERE group_name LIKE 'E2E Dup Group %'`
  );
  await db.query(
    `DELETE FROM attribute WHERE attribute_code LIKE 'e2e-dup-color-%'`
  );
}

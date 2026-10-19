import { afterAll, describe, jest } from '@jest/globals';
import type { StoreFixture } from '../../../services/ports/lookup.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import { MemoryServices } from '../../../testing/MemoryServices.js';
import { productServicesContract } from '../helpers/productServicesContract.js';
import type {
  ProductCatalog,
  ProductServicesHarness
} from '../helpers/productServicesContract.js';
import { openScratchDb, pointCoreAt } from '../helpers/scratchDb.js';

/**
 * The services that write products, held to one contract: `MemoryServices`
 * everywhere, and core's own services (the product, the variant group and the
 * redirect services) on the second scratch database, which is a schema-only copy
 * of core with no store running on it. Each test removes what it made.
 */
jest.setTimeout(60_000);

const CATALOG: StoreFixture = {
  attributeGroups: [
    { name: 'Contract group', attributes: ['color', 'size', 'tags', 'note'] },
    { name: 'Other contract group', attributes: ['color'] }
  ],
  packages: [
    { name: 'Contract box', isDefault: true },
    { name: 'Contract pallet' }
  ],
  taxClasses: [{ name: 'Contract tax' }],
  categories: [{ urlKey: 'contract-cat', name: 'Contract category' }],
  attributes: [
    { code: 'color', type: 'select', options: ['Black', 'White'] },
    { code: 'size', type: 'select', options: ['S', 'M'] },
    { code: 'tags', type: 'multiselect', options: ['a', 'b', 'c'] },
    { code: 'note', type: 'text' },
    { code: 'other', type: 'select', options: ['x'] }
  ]
};

// ---- in memory ---------------------------------------------------------

function memoryHarness(): ProductServicesHarness {
  const lookup = new MemoryLookup(CATALOG);
  const memory = new MemoryServices(lookup);
  const catalog: ProductCatalog = {
    groupId: 1,
    otherGroupId: 2,
    packageId: 1,
    otherPackageId: 2,
    taxClassId: 1,
    categoryId: 1,
    option: (code, text) => lookup.optionId(code, text) as number
  };
  return {
    services: memory,
    catalog,
    async product(sku) {
      const stored = lookup.products_.get(sku);
      if (!stored) return null;
      const written = memory.writtenProducts.get(stored.uuid);
      const category = stored.categoryUrlKey
        ? lookup.stored.get(stored.categoryUrlKey)
        : undefined;
      return {
        id: stored.id,
        uuid: stored.uuid,
        name: written?.name ?? '',
        urlKey: stored.urlKey,
        price: written?.price ?? '',
        qty: Number(written?.qty ?? 0),
        status: stored.status,
        groupId: stored.attributeGroupId,
        packageId: stored.packageId,
        noShippingRequired: stored.noShippingRequired,
        categoryId: category?.id ?? null,
        variantGroupId: stored.variantGroupId,
        attributes: Object.fromEntries(
          Object.entries(stored.values).map(([code, text]) => [
            code,
            text.split('|').sort()
          ])
        ),
        images: memory.images.get(stored.uuid) ?? []
      };
    },
    async countProducts() {
      return lookup.products_.size;
    },
    async redirect(path) {
      const row = memory.redirectRows.get(path);
      return row
        ? {
            toPath: row.toPath,
            statusCode: row.statusCode,
            source: row.source,
            entityUrn: row.entityUrn
          }
        : null;
    },
    async variantGroup(uuid) {
      const group = [...lookup.variantGroups_.values()].find(
        (g) => g.uuid === uuid
      );
      return group
        ? { attributeGroupId: group.attributeGroupId, axes: group.axes }
        : null;
    }
  };
}

productServicesContract('MemoryServices', async () => memoryHarness());

// ---- core's services, on the second scratch database -------------------

const db = await openScratchDb({ core: true });
if (db) pointCoreAt(db);
const describeDb = db ? describe : describe.skip;

const { createCoreEntityServices } = db
  ? await import('../../../adapters/CoreEntityServices.js')
  : { createCoreEntityServices: null };
const corePool = db
  ? (await import('../../../../../lib/postgres/connection.js')).pool
  : null;

afterAll(async () => {
  await corePool?.end();
  await db?.close();
});

let eventBaseline = 0;

async function cleanUp() {
  const q = (sql: string, params: unknown[] = []) =>
    db!.pool.query(sql, params);
  await q(`DELETE FROM product WHERE sku ~ '^C[TUVR]-'`);
  await q(
    `DELETE FROM url_rewrite WHERE request_path ~ '^/(contract-cat|c[tuvr]-)'`
  );
  await q(
    `DELETE FROM variant_group WHERE attribute_group_id IN
       (SELECT attribute_group_id FROM attribute_group WHERE group_name LIKE '%ontract group')`
  );
  await q(
    `DELETE FROM url_redirect WHERE from_path LIKE '/contract-old/%' OR from_path ~ '^/c[tuvr]-'`
  );
  await q(
    `DELETE FROM attribute WHERE attribute_code IN ('color','size','tags','note','other')`
  );
  await q(`DELETE FROM package WHERE name LIKE 'Contract %'`);
  await q(
    `DELETE FROM category WHERE category_id IN
       (SELECT category_description_category_id FROM category_description WHERE url_key = 'contract-cat')`
  );
  // The first attribute group and the first tax class of a database are the default
  // ones, and a trigger refuses to delete them; the scratch database has none of the
  // store's own, so the ones made here are those.
  await q(
    `DO $$ BEGIN
       ALTER TABLE attribute_group DISABLE TRIGGER USER;
       ALTER TABLE tax_class DISABLE TRIGGER USER;
       DELETE FROM attribute_group WHERE group_name LIKE '%ontract group';
       DELETE FROM tax_class WHERE name = 'Contract tax';
       ALTER TABLE attribute_group ENABLE TRIGGER USER;
       ALTER TABLE tax_class ENABLE TRIGGER USER;
     END $$`
  );
  await q('DELETE FROM event WHERE event_id > $1', [eventBaseline]);
}

async function seed(): Promise<ProductCatalog> {
  const q = async (sql: string, params: unknown[] = []) =>
    (await db!.pool.query(sql, params)).rows;
  // The base migration 1.0.8 for a scratch database made before it (idempotent).
  await q(
    `ALTER TABLE url_redirect ADD COLUMN IF NOT EXISTS status_code SMALLINT NOT NULL DEFAULT 302`
  );
  eventBaseline = Number(
    (await q('SELECT COALESCE(max(event_id), 0) AS n FROM event'))[0].n
  );
  await cleanUp();
  eventBaseline = Number(
    (await q('SELECT COALESCE(max(event_id), 0) AS n FROM event'))[0].n
  );
  const group = async (name: string) =>
    (
      await q(
        'INSERT INTO attribute_group (group_name) VALUES ($1) RETURNING attribute_group_id',
        [name]
      )
    )[0].attribute_group_id as number;
  const groupId = await group('Contract group');
  const otherGroupId = await group('Other contract group');
  const options = new Map<string, number>();
  for (const attribute of CATALOG.attributes ?? []) {
    // eslint-disable-next-line no-await-in-loop
    const [row] = await q(
      `INSERT INTO attribute (attribute_code, attribute_name, type)
       VALUES ($1, $1, $2) RETURNING attribute_id`,
      [attribute.code, attribute.type]
    );
    for (const text of attribute.options ?? []) {
      // eslint-disable-next-line no-await-in-loop
      const [option] = await q(
        `INSERT INTO attribute_option (attribute_id, attribute_code, option_text)
         VALUES ($1, $2, $3) RETURNING attribute_option_id`,
        [row.attribute_id, attribute.code, text]
      );
      options.set(`${attribute.code}|${text}`, option.attribute_option_id);
    }
    const links: Array<[number, string[]]> = [
      [groupId, ['color', 'size', 'tags', 'note']],
      [otherGroupId, ['color']]
    ];
    for (const [id, codes] of links) {
      if (codes.includes(attribute.code)) {
        // eslint-disable-next-line no-await-in-loop
        await q(
          'INSERT INTO attribute_group_link (attribute_id, group_id) VALUES ($1, $2)',
          [row.attribute_id, id]
        );
      }
    }
  }
  const pack = async (name: string) =>
    (
      await q(
        `INSERT INTO package (name, length, width, height, is_default)
         VALUES ($1, 1, 1, 1, false) RETURNING package_id`,
        [name]
      )
    )[0].package_id as number;
  const packageId = await pack('Contract box');
  const otherPackageId = await pack('Contract pallet');
  const taxClassId = (
    await q(
      `INSERT INTO tax_class (name) VALUES ('Contract tax') RETURNING tax_class_id`
    )
  )[0].tax_class_id as number;
  const categoryId = (
    await q(`INSERT INTO category (status) VALUES (true) RETURNING category_id`)
  )[0].category_id as number;
  await q(
    `INSERT INTO category_description (category_description_category_id, name, url_key)
     VALUES ($1, 'Contract category', 'contract-cat')`,
    [categoryId]
  );
  // The path of the category, which a subscriber builds after the commit in a store.
  await q(
    `INSERT INTO url_rewrite (request_path, target_path, entity_uuid, entity_type)
     SELECT '/contract-cat', '/category/' || uuid, uuid, 'category'
       FROM category WHERE category_id = $1`,
    [categoryId]
  );
  return {
    groupId,
    otherGroupId,
    packageId,
    otherPackageId,
    taxClassId,
    categoryId,
    option: (code, text) => options.get(`${code}|${text}`) as number
  };
}

async function realHarness(): Promise<ProductServicesHarness> {
  const catalog = await seed();
  const q = async (sql: string, params: unknown[] = []) =>
    (await db!.pool.query(sql, params)).rows;
  return {
    services: createCoreEntityServices!(db!.pool),
    catalog,
    async product(sku) {
      const [row] = await q(
        `SELECT p.product_id, p.uuid, pd.name, pd.url_key, p.price, i.qty, p.status,
                p.group_id, p.package_id, p.no_shipping_required, p.category_id,
                p.variant_group_id
           FROM product p
           JOIN product_description pd ON pd.product_description_product_id = p.product_id
           LEFT JOIN product_inventory i ON i.product_inventory_product_id = p.product_id
          WHERE p.sku = $1`,
        [sku]
      );
      if (!row) return null;
      const values = await q(
        `SELECT a.attribute_code, v.option_text
           FROM product_attribute_value_index v
           JOIN attribute a ON a.attribute_id = v.attribute_id
          WHERE v.product_id = $1 ORDER BY v.option_text`,
        [row.product_id]
      );
      const attributes: Record<string, string[]> = {};
      for (const value of values) {
        (attributes[value.attribute_code] ??= []).push(value.option_text);
      }
      const images = await q(
        `SELECT origin_image FROM product_image
          WHERE product_image_product_id = $1
          ORDER BY is_main DESC, product_image_id`,
        [row.product_id]
      );
      return {
        id: Number(row.product_id),
        uuid: row.uuid,
        name: row.name,
        urlKey: row.url_key,
        price: String(row.price),
        qty: Number(row.qty),
        status: row.status ? 1 : 0,
        groupId: row.group_id,
        packageId: row.package_id,
        noShippingRequired: Boolean(row.no_shipping_required),
        categoryId: row.category_id,
        variantGroupId: row.variant_group_id,
        attributes,
        images: images.map((image) => image.origin_image as string)
      };
    },
    async countProducts() {
      return Number(
        (
          await q(`SELECT count(*) AS n FROM product WHERE sku ~ '^C[TUVR]-'`)
        )[0].n
      );
    },
    async redirect(path) {
      const [row] = await q(
        'SELECT to_path, status_code, source, entity_urn FROM url_redirect WHERE from_path = $1',
        [path]
      );
      return row
        ? {
            toPath: row.to_path,
            statusCode: row.status_code,
            source: row.source,
            entityUrn: row.entity_urn
          }
        : null;
    },
    async variantGroup(uuid) {
      const [row] = await q(
        `SELECT attribute_group_id,
                ARRAY(SELECT a.attribute_code FROM attribute a
                       WHERE a.attribute_id IN (attribute_one, attribute_two,
                         attribute_three, attribute_four, attribute_five)) AS axes
           FROM variant_group WHERE uuid = $1`,
        [uuid]
      );
      return row
        ? { attributeGroupId: row.attribute_group_id, axes: row.axes }
        : null;
    }
  };
}

describeDb('the real product services of core', () => {
  productServicesContract('CoreEntityServices', realHarness);

  afterAll(async () => {
    await cleanUp();
  });
});

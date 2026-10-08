import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  afterAll
} from '@jest/globals';
import { Pool } from 'pg';
import { getCategoryTree } from '../../services/getCategoryTree.js';
import { getStoreFilterableAttributes } from '../../services/getFilterableAttributes.js';

/**
 * The three SQL services behind the `/products` facets, against a scratch
 * database with stub catalog tables. These are the queries that cannot be
 * verified by shape alone — recursive depth, tree ordering, the EXISTS guard,
 * and the two-sided group narrowing all only show up when Postgres runs them.
 *
 * Self-skipping like resolveRecommendations.test.ts: the probe proves PG13+ and
 * CREATEDB by creating the scratch DB itself.
 */

jest.setTimeout(30000);

const SCRATCH_DB = 'evershop_listing_facets_test';

function poolConfig(database: string) {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || undefined,
    password: process.env.DB_PASSWORD || undefined,
    database
  };
}

async function probeServer(): Promise<boolean> {
  const probe = new Pool({ ...poolConfig('postgres'), max: 1 });
  try {
    const version = await probe.query(
      `SELECT current_setting('server_version_num')::int AS v`
    );
    if (version.rows[0].v < 130000) {
      return false;
    }
    await probe.query(`DROP DATABASE IF EXISTS ${SCRATCH_DB} WITH (FORCE)`);
    await probe.query(`CREATE DATABASE ${SCRATCH_DB}`);
    return true;
  } catch {
    return false;
  } finally {
    await probe.end().catch(() => {});
  }
}

const serverAvailable = await probeServer();
const describeDb = serverAvailable ? describe : describe.skip;

describeDb('listing facet queries (scratch DB)', () => {
  let db: Pool;

  const names = (rows: Array<{ name: string }>) => rows.map((r) => r.name);

  beforeAll(async () => {
    db = new Pool({ ...poolConfig(SCRATCH_DB), max: 2 });

    await db.query(`
      CREATE TABLE category (
        category_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        uuid UUID NOT NULL DEFAULT gen_random_uuid(),
        status boolean NOT NULL,
        parent_id INT DEFAULT NULL,
        position smallint DEFAULT NULL
      );
      CREATE TABLE category_description (
        category_description_category_id INT NOT NULL,
        name varchar NOT NULL
      );
      CREATE TABLE attribute_group (
        attribute_group_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        group_name text NOT NULL
      );
      CREATE TABLE attribute (
        attribute_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        attribute_code varchar NOT NULL,
        attribute_name varchar NOT NULL,
        type varchar NOT NULL,
        is_filterable boolean NOT NULL DEFAULT FALSE,
        sort_order INT NOT NULL DEFAULT 0
      );
      CREATE TABLE attribute_group_link (
        attribute_id INT NOT NULL,
        group_id INT NOT NULL
      );
      CREATE TABLE attribute_option (
        attribute_option_id INT NOT NULL PRIMARY KEY,
        attribute_id INT NOT NULL,
        attribute_code varchar NOT NULL,
        option_text varchar NOT NULL
      );
      CREATE TABLE product (
        product_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        sku varchar NOT NULL,
        status boolean NOT NULL DEFAULT TRUE,
        visibility boolean NOT NULL DEFAULT TRUE,
        group_id INT DEFAULT 1,
        category_id INT DEFAULT NULL
      );
      CREATE TABLE product_attribute_value_index (
        product_id INT NOT NULL,
        attribute_id INT NOT NULL,
        option_id INT NOT NULL,
        option_text varchar NOT NULL
      );
    `);
  });

  afterAll(async () => {
    await db?.end().catch(() => {});
    const admin = new Pool({ ...poolConfig('postgres'), max: 1 });
    await admin
      .query(`DROP DATABASE IF EXISTS ${SCRATCH_DB} WITH (FORCE)`)
      .catch(() => {});
    await admin.end().catch(() => {});
  });

  async function addCategory(
    name: string,
    opts: { parent?: number | null; status?: boolean; position?: number } = {}
  ): Promise<number> {
    const { rows } = await db.query(
      `INSERT INTO category (status, parent_id, position) VALUES ($1, $2, $3)
       RETURNING category_id`,
      [opts.status ?? true, opts.parent ?? null, opts.position ?? 0]
    );
    const id = rows[0].category_id;
    await db.query(
      `INSERT INTO category_description (category_description_category_id, name)
       VALUES ($1, $2)`,
      [id, name]
    );
    return id;
  }

  describe('getCategoryTree', () => {
    let men: number;

    beforeAll(async () => {
      // Men(0) > Shoes(0) > Sneakers, Boots ; Men > Shirts(1)
      // Women(1). Archive(2) is disabled and has an ENABLED child.
      men = await addCategory('Men', { position: 0 });
      const shoes = await addCategory('Shoes', { parent: men, position: 0 });
      await addCategory('Sneakers', { parent: shoes, position: 0 });
      await addCategory('Boots', { parent: shoes, position: 1 });
      await addCategory('Shirts', { parent: men, position: 1 });
      await addCategory('Women', { position: 1 });
      const archive = await addCategory('Archive', {
        position: 2,
        status: false
      });
      await addCategory('Old stock', { parent: archive });
    });

    it('returns the tree depth-first, parents immediately before their descendants', async () => {
      const tree = await getCategoryTree(db);
      expect(names(tree)).toEqual([
        'Men',
        'Shoes',
        'Sneakers',
        'Boots',
        'Shirts',
        'Women'
      ]);
    });

    it('reports depth relative to the root', async () => {
      const tree = await getCategoryTree(db);
      const byName = Object.fromEntries(tree.map((c) => [c.name, c.depth]));
      expect(byName).toMatchObject({
        Men: 0,
        Shoes: 1,
        Sneakers: 2,
        Boots: 2,
        Shirts: 1,
        Women: 0
      });
    });

    it('orders siblings by position, not by insertion or name', async () => {
      const tree = await getCategoryTree(db);
      // Sneakers(position 0) before Boots(position 1) despite "Boots" < "Sneakers".
      expect(names(tree).indexOf('Sneakers')).toBeLessThan(
        names(tree).indexOf('Boots')
      );
    });

    it('sorts position numerically, not lexically', async () => {
      const late = await addCategory('Late', { parent: men, position: 10 });
      const tree = await getCategoryTree(db);
      // Lexically "10" < "2", so an unpadded text sort would put Late first.
      expect(names(tree).indexOf('Shirts')).toBeLessThan(
        names(tree).indexOf('Late')
      );
      await db.query(`DELETE FROM category WHERE category_id = $1`, [late]);
    });

    it('excludes a disabled category AND its enabled descendants', async () => {
      const tree = await getCategoryTree(db);
      expect(names(tree)).not.toContain('Archive');
      // 'Old stock' is enabled but unreachable on the storefront, so offering it
      // as a filter would be a dead end.
      expect(names(tree)).not.toContain('Old stock');
    });

    it('carries the uuid through for the facet checkbox key', async () => {
      const tree = await getCategoryTree(db);
      expect(tree[0].uuid).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('getStoreFilterableAttributes', () => {
    let clothing: number;
    let phones: number;
    let empty: number;
    let noFacets: number;

    beforeAll(async () => {
      const group = async (name: string) =>
        (
          await db.query(
            `INSERT INTO attribute_group (group_name) VALUES ($1) RETURNING attribute_group_id`,
            [name]
          )
        ).rows[0].attribute_group_id;

      const attribute = async (
        code: string,
        opts: { filterable?: boolean; sortOrder?: number; type?: string } = {}
      ) =>
        (
          await db.query(
            `INSERT INTO attribute (attribute_code, attribute_name, type, is_filterable, sort_order)
             VALUES ($1, $1, $2, $3, $4) RETURNING attribute_id`,
            [
              code,
              opts.type ?? 'select',
              opts.filterable ?? true,
              opts.sortOrder ?? 0
            ]
          )
        ).rows[0].attribute_id;

      clothing = await group('Clothing');
      phones = await group('iPhone');
      empty = await group('Empty');
      noFacets = await group('No facets');

      // sort_order is deliberately the INVERSE of attribute_id so the test can
      // tell the two orderings apart.
      const color = await attribute('color', { sortOrder: 20 });
      const size = await attribute('size', { sortOrder: 10 });
      const iphoneColor = await attribute('iphone_color', { sortOrder: 30 });
      const plain = await attribute('material', { filterable: false });

      await db.query(
        `INSERT INTO attribute_group_link (attribute_id, group_id) VALUES
         ($1,$5),($2,$5),($3,$6),($4,$7)`,
        [color, size, iphoneColor, plain, clothing, phones, noFacets]
      );

      const product = async (
        groupId: number,
        opts: { status?: boolean; visibility?: boolean } = {}
      ) =>
        (
          await db.query(
            `INSERT INTO product (sku, status, visibility, group_id)
             VALUES (gen_random_uuid()::text, $1, $2, $3) RETURNING product_id`,
            [opts.status ?? true, opts.visibility ?? true, groupId]
          )
        ).rows[0].product_id;

      const shirt = await product(clothing);
      const trousers = await product(clothing);
      await product(clothing, { status: false });
      await product(clothing, { visibility: false });
      const iphone = await product(phones);
      await product(noFacets);

      await db.query(
        `INSERT INTO attribute_option (attribute_option_id, attribute_id, attribute_code, option_text) VALUES
         (11,$1,'color','Red'), (12,$1,'color','Blue'), (13,$1,'color','Pink'),
         (14,$1,'color','Unused'),
         (21,$2,'size','S'), (22,$2,'size','M'),
         (31,$3,'iphone_color','Graphite')`,
        [color, size, iphoneColor]
      );
      await db.query(
        `INSERT INTO product_attribute_value_index (product_id, attribute_id, option_id, option_text) VALUES
         ($1,$5,11,'Red'), ($1,$6,21,'S'),
         ($2,$5,12,'Blue'), ($2,$6,22,'M'),
         ($3,$7,31,'Graphite'),
         ($4,$5,13,'Pink')`,
        [shirt, trousers, iphone, iphone, color, size, iphoneColor]
      );
      // Note $4 = iphone as well: an iPhone product still carrying a `color`
      // row, which is what happens when a product changes group.
    });

    it('orders store-wide attributes by sort_order, not attribute_id', async () => {
      const attributes = await getStoreFilterableAttributes(db);
      // size(sort 10) < color(sort 20) < iphone_color(sort 30), the reverse of
      // their creation order.
      expect(attributes.map((a) => a.attributeCode)).toEqual([
        'size',
        'color',
        'iphone_color'
      ]);
    });

    it('collects every option used across the store', async () => {
      const attributes = await getStoreFilterableAttributes(db);
      const color = attributes.find((a) => a.attributeCode === 'color');
      expect(color?.options.map((o) => o.optionText)).toEqual([
        'Red',
        'Blue',
        'Pink'
      ]);
    });

    it('drops an option no product has been assigned', async () => {
      // 'Unused' exists in attribute_option but has no value-index row, so the
      // EXISTS probe rejects it. This is the half of "filterable" that the
      // attribute flag alone does not cover.
      const attributes = await getStoreFilterableAttributes(db);
      const color = attributes.find((a) => a.attributeCode === 'color');
      expect(color?.options.map((o) => o.optionText)).not.toContain('Unused');
    });

    it('excludes non-filterable and non-select attributes', async () => {
      const attributes = await getStoreFilterableAttributes(db);
      expect(attributes.map((a) => a.attributeCode)).not.toContain('material');
    });

    it('includes attributes from EVERY group, not just one', async () => {
      // Attribute groups are an admin authoring construct; an attribute any
      // product carries a value for is offered to every shopper.
      const attributes = await getStoreFilterableAttributes(db);
      expect(attributes.map((a) => a.attributeCode).sort()).toEqual([
        'color',
        'iphone_color',
        'size'
      ]);
    });

  });
});

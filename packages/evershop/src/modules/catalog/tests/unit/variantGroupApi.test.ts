import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  createFakeCatalogDb,
  createFakeCatalogQueryBuilder
} from './fakeCatalogDb.js';

/**
 * The two admin API handlers that make variant groups (createVariantGroup and
 * addVariantItem), as a client sees them: the status, the message and the body,
 * and the rows that are written. They are the oracle for the variant group
 * services (G1): the handlers were turned into thin callers of the services and
 * these tests passed on the code before and after.
 */

const ATTRS = [
  { attribute_id: 1, attribute_code: 'color', type: 'select' },
  { attribute_id: 2, attribute_code: 'size', type: 'select' },
  { attribute_id: 3, attribute_code: 'material', type: 'text' },
  { attribute_id: 4, attribute_code: 'fit', type: 'select' },
  { attribute_id: 5, attribute_code: 'brand', type: 'select' },
  { attribute_id: 6, attribute_code: 'season', type: 'select' },
  { attribute_id: 7, attribute_code: 'style', type: 'select' }
];
const OPTIONS = [
  { attribute_option_id: 11, attribute_id: 1, option_text: 'Black' },
  { attribute_option_id: 12, attribute_id: 1, option_text: 'White' },
  { attribute_option_id: 21, attribute_id: 2, option_text: 'S' }
];
const seed = () => ({
  attribute: ATTRS,
  attribute_option: OPTIONS,
  // group 10 has color, size, material (a text one), fit; group 20 only color
  attribute_group_link: [
    { group_id: 10, attribute_id: 1 },
    { group_id: 10, attribute_id: 2 },
    { group_id: 10, attribute_id: 3 },
    { group_id: 10, attribute_id: 4 },
    { group_id: 20, attribute_id: 1 }
  ],
  variant_group: [
    {
      variant_group_id: 500,
      uuid: 'vg-1',
      attribute_group_id: 10,
      attribute_one: 1,
      attribute_two: 2,
      attribute_three: null,
      attribute_four: null,
      attribute_five: null,
      visibility: true
    }
  ],
  product: [
    { product_id: 101, uuid: 'p1', group_id: 10, variant_group_id: null, package_id: null },
    { product_id: 102, uuid: 'p2', group_id: 10, variant_group_id: 500, package_id: 5 },
    { product_id: 103, uuid: 'p3', group_id: 10, variant_group_id: null, package_id: 7 },
    { product_id: 104, uuid: 'p4', group_id: 20, variant_group_id: null, package_id: null },
    { product_id: 105, uuid: 'p5', group_id: 10, variant_group_id: 500, package_id: null }
  ],
  product_attribute_value_index: [
    { product_id: 101, attribute_id: 1, option_id: 11 },
    { product_id: 101, attribute_id: 2, option_id: 21 },
    { product_id: 101, attribute_id: 3, option_id: 31 },
    { product_id: 102, attribute_id: 1, option_id: 12 }
  ]
});

const db = createFakeCatalogDb(seed());
const qb = createFakeCatalogQueryBuilder(db);

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({ ...qb }));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: qb.pool,
  getConnection: qb.getConnection
}));
jest.unstable_mockModule('../../../../lib/router/buildUrl.js', () => ({
  buildUrl: (route: string, params: Record<string, string>) =>
    `/api/${route}/${params.id}`
}));

const { default: createGroupHandler } = await import(
  '../../api/createVariantGroup/[bodyParser]saveGroup.js'
);
const { default: addItemHandler } = await import(
  '../../api/addVariantItem/[bodyParser]addItem.js'
);

function reply() {
  const response: {
    statusCode?: number;
    body?: any;
    status(code: number): typeof response;
    json(body: unknown): void;
  } = {
    status(code) {
      response.statusCode = code;
      return response;
    },
    json(body) {
      response.body = body;
    }
  };
  return response;
}

async function createGroup(body: Record<string, unknown>) {
  const response = reply();
  await (createGroupHandler as any)({ body }, response, () => {});
  return response;
}
async function addItem(groupUuid: string, productUuid: string) {
  const response = reply();
  await (addItemHandler as any)(
    { params: { id: groupUuid }, body: { product_id: productUuid } },
    response,
    () => {}
  );
  return response;
}
const productRow = (uuid: string) =>
  db.tables.product.find((p) => p.uuid === uuid)!;

beforeEach(() => {
  Object.assign(db, createFakeCatalogDb(seed()));
  db.failOn = {};
});

describe('POST /variant-groups (createVariantGroup)', () => {
  it('refuses no attributes', async () => {
    const r = await createGroup({ attribute_codes: [], attribute_group_id: 10 });
    expect(r.statusCode).toBe(400);
    expect(r.body).toEqual({
      error: { status: 400, message: 'No attributes provided' }
    });
    expect(db.inserts).toEqual([]);
  });

  it('refuses more than five attributes', async () => {
    const r = await createGroup({
      attribute_codes: ['color', 'size', 'fit', 'brand', 'season', 'style'],
      attribute_group_id: 10
    });
    expect(r.statusCode).toBe(400);
    expect(r.body.error.message).toBe('We only support up to 5 attributes');
    expect(db.inserts).toEqual([]);
  });

  it('refuses an attribute that is not a select, and one that does not exist', async () => {
    for (const codes of [['color', 'material'], ['color', 'nope']]) {
      // eslint-disable-next-line no-await-in-loop
      const r = await createGroup({
        attribute_codes: codes,
        attribute_group_id: 10
      });
      expect(r.statusCode).toBe(400);
      expect(r.body.error.message).toBe('Attribute must be of type select');
    }
    expect(db.inserts).toEqual([]);
  });

  it('refuses an attribute that is not assigned to the attribute group', async () => {
    const r = await createGroup({
      attribute_codes: ['color', 'size'],
      attribute_group_id: 20
    });
    expect(r.statusCode).toBe(400);
    expect(r.body.error.message).toBe('Attribute must be assigned to the group');
    expect(db.inserts).toEqual([]);
  });

  it('creates the group, one column per attribute in the order the database gives them', async () => {
    // asked as size, color; the attribute table answers color, size
    const r = await createGroup({
      attribute_codes: ['size', 'color'],
      attribute_group_id: 10
    });
    expect(r.statusCode).toBe(200);
    expect(db.inserts).toEqual([
      {
        table: 'variant_group',
        data: { attribute_one: 1, attribute_two: 2, attribute_group_id: 10 }
      }
    ]);
    const { data } = r.body;
    expect(data.attribute_group_id).toBe(10);
    expect(data.attribute_one).toBe(1);
    expect(data.attribute_two).toBe(2);
    expect(data.uuid).toMatch(/^uuid-/);
    expect(data.addItemApi).toBe(`/api/addVariantItem/${data.uuid}`);
    expect(data.attributes).toEqual([
      { ...ATTRS[0], options: [OPTIONS[0], OPTIONS[1]] },
      { ...ATTRS[1], options: [OPTIONS[2]] }
    ]);
  });

  it('answers 500 with the message of an error from the database', async () => {
    db.failOn.variant_group = new Error('connection terminated');
    const r = await createGroup({
      attribute_codes: ['color'],
      attribute_group_id: 10
    });
    expect(r.statusCode).toBe(500);
    expect(r.body).toEqual({
      error: { status: 500, message: 'connection terminated' }
    });
  });
});

describe('POST /variant-groups/:id/items (addVariantItem)', () => {
  it('refuses a group that does not exist', async () => {
    const r = await addItem('nope', 'p1');
    expect(r.statusCode).toBe(400);
    expect(r.body).toEqual({
      error: { status: 400, message: 'Invalid variant group' }
    });
    expect(db.updates).toEqual([]);
  });

  it('refuses a product that does not exist, and one of another attribute group', async () => {
    for (const uuid of ['nope', 'p4']) {
      // eslint-disable-next-line no-await-in-loop
      const r = await addItem('vg-1', uuid);
      expect(r.statusCode).toBe(400);
      expect(r.body.error.message).toBe(
        'The product is either not exist or using different attribute group'
      );
    }
    expect(db.updates).toEqual([]);
  });

  it('puts the product in the group and answers with the values of the axes only', async () => {
    const r = await addItem('vg-1', 'p1');
    expect(r.statusCode).toBe(200);
    expect(productRow('p1').variant_group_id).toBe(500);
    expect(r.body.data.id).toEqual(expect.any(String));
    // color and size, not material (attribute 3 is not an axis of the group)
    expect(r.body.data.attributes).toEqual([
      { attribute_id: 1, attribute_code: 'color', option_id: 11 },
      { attribute_id: 2, attribute_code: 'size', option_id: 21 }
    ]);
    // the product as it was loaded, before it joined
    expect(r.body.data.product).toMatchObject({
      product_id: 101,
      uuid: 'p1',
      variant_group_id: null
    });
  });

  it('gives the joining product the package of the group', async () => {
    await addItem('vg-1', 'p1');
    expect(productRow('p1').package_id).toBe(5);
    expect(productRow('p2').package_id).toBe(5);
  });

  it('spreads the package of the joining product when the group has none yet', async () => {
    db.tables.product.find((p) => p.uuid === 'p2')!.package_id = null;
    await addItem('vg-1', 'p3');
    expect(productRow('p3').package_id).toBe(7);
    expect(productRow('p2').package_id).toBe(7);
    expect(productRow('p5').package_id).toBe(7);
    // a product outside the group is not touched
    expect(productRow('p1').package_id).toBeNull();
  });

  it('leaves every package alone when neither side has one', async () => {
    db.tables.product.find((p) => p.uuid === 'p2')!.package_id = null;
    await addItem('vg-1', 'p1');
    expect(db.tables.product.map((p) => p.package_id)).toEqual([
      null,
      null,
      7,
      null,
      null
    ]);
  });

  it('commits one transaction, and rolls back and answers 500 on an error', async () => {
    const ok = await addItem('vg-1', 'p1');
    expect(ok.statusCode).toBe(200);
    expect(db.tx.started).toBe(1);
    expect(db.tx.committed).toBe(1);
    expect(db.tx.rolledBack).toBe(0);

    db.failOn.product_attribute_value_index = new Error('deadlock detected');
    const failed = await addItem('vg-1', 'p3');
    expect(failed.statusCode).toBe(500);
    expect(failed.body).toEqual({
      error: { status: 500, message: 'deadlock detected' }
    });
    expect(db.tx.rolledBack).toBe(1);
  });
});

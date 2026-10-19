import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  createFakeCatalogDb,
  createFakeCatalogQueryBuilder
} from './fakeCatalogDb.js';

/**
 * The variant group services (G1), called directly: the typed refusals, what
 * they return, and what they leave behind (a connection that is given back).
 * What the admin API shows a client is in variantGroupApi.test.ts.
 */

const selects = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    attribute_id: i + 1,
    attribute_code: `axis${i + 1}`,
    type: 'select'
  }));
const seed = () => ({
  attribute: [...selects(6), { attribute_id: 9, attribute_code: 'note', type: 'text' }],
  attribute_group_link: [1, 2, 3, 4, 5, 6, 9].map((attribute_id) => ({
    group_id: 10,
    attribute_id
  })),
  variant_group: [
    {
      variant_group_id: 500,
      uuid: 'vg-1',
      attribute_group_id: 10,
      attribute_one: 1,
      attribute_two: 2,
      attribute_three: null,
      attribute_four: null,
      attribute_five: null
    }
  ],
  product: [
    { product_id: 101, uuid: 'p1', group_id: 10, variant_group_id: null, package_id: null },
    { product_id: 102, uuid: 'p2', group_id: 10, variant_group_id: 500, package_id: 5 },
    { product_id: 104, uuid: 'p4', group_id: 20, variant_group_id: null, package_id: null }
  ],
  product_attribute_value_index: [
    { product_id: 101, attribute_id: 1, option_id: 11 },
    { product_id: 101, attribute_id: 2, option_id: 21 },
    { product_id: 101, attribute_id: 3, option_id: 31 }
  ]
});

const db = createFakeCatalogDb(seed());
const qb = createFakeCatalogQueryBuilder(db);

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({ ...qb }));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: qb.pool,
  getConnection: qb.getConnection
}));

const { default: createVariantGroup } = await import(
  '../../services/variant/createVariantGroup.js'
);
const { default: addVariantItem } = await import(
  '../../services/variant/addVariantItem.js'
);
const { VariantGroupError } = await import(
  '../../services/variant/VariantGroupError.js'
);

async function refusal(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    return e as InstanceType<typeof VariantGroupError>;
  }
  throw new Error('expected the service to reject');
}

beforeEach(() => {
  Object.assign(db, createFakeCatalogDb(seed()));
  db.failOn = {};
});

describe('createVariantGroup', () => {
  it('returns the group and the axes, and writes one row', async () => {
    const { group, attributes } = await createVariantGroup({
      attribute_group_id: 10,
      attribute_codes: ['axis1', 'axis2']
    });
    expect(group).toMatchObject({
      attribute_group_id: 10,
      attribute_one: 1,
      attribute_two: 2,
      attribute_three: null
    });
    expect(group.uuid).toMatch(/^uuid-/);
    expect(attributes.map((a) => a.attribute_code)).toEqual(['axis1', 'axis2']);
    expect(db.inserts).toHaveLength(1);
  });

  it('takes five axes and puts each in its own column', async () => {
    const { group } = await createVariantGroup({
      attribute_group_id: 10,
      attribute_codes: ['axis1', 'axis2', 'axis3', 'axis4', 'axis5']
    });
    expect([
      group.attribute_one,
      group.attribute_two,
      group.attribute_three,
      group.attribute_four,
      group.attribute_five
    ]).toEqual([1, 2, 3, 4, 5]);
  });

  it.each([
    ['no attributes', [], 'NO_ATTRIBUTES', 'No attributes provided'],
    [
      'six attributes',
      ['axis1', 'axis2', 'axis3', 'axis4', 'axis5', 'axis6'],
      'TOO_MANY_ATTRIBUTES',
      'We only support up to 5 attributes'
    ],
    [
      'an attribute that is not a select',
      ['axis1', 'note'],
      'ATTRIBUTE_NOT_SELECT',
      'Attribute must be of type select'
    ],
    [
      'an attribute that does not exist',
      ['axis1', 'nope'],
      'ATTRIBUTE_NOT_SELECT',
      'Attribute must be of type select'
    ]
  ])('refuses %s', async (_name, attribute_codes, code, message) => {
    const e = await refusal(
      createVariantGroup({ attribute_group_id: 10, attribute_codes })
    );
    expect(e).toBeInstanceOf(VariantGroupError);
    expect(e.code).toBe(code);
    expect(e.message).toBe(message);
    expect(db.inserts).toEqual([]);
  });

  it('refuses an attribute that is not linked to the attribute group', async () => {
    const e = await refusal(
      createVariantGroup({
        attribute_group_id: 20,
        attribute_codes: ['axis1']
      })
    );
    expect(e.code).toBe('ATTRIBUTE_NOT_IN_GROUP');
    expect(e.message).toBe('Attribute must be assigned to the group');
    expect(db.inserts).toEqual([]);
  });

  it('lets an error of the database through as it is', async () => {
    db.failOn.variant_group = new Error('connection terminated');
    const e = await refusal(
      createVariantGroup({ attribute_group_id: 10, attribute_codes: ['axis1'] })
    );
    expect(e).not.toBeInstanceOf(VariantGroupError);
    expect(e.message).toBe('connection terminated');
  });
});

describe('addVariantItem', () => {
  it('returns the product as it was and its values for the axes', async () => {
    const { product, attributes } = await addVariantItem('vg-1', 'p1');
    expect(product).toMatchObject({ uuid: 'p1', variant_group_id: null });
    expect(attributes).toEqual([
      { attribute_id: 1, attribute_code: 'axis1', option_id: 11 },
      { attribute_id: 2, attribute_code: 'axis2', option_id: 21 }
    ]);
    expect(
      db.tables.product.find((p) => p.uuid === 'p1')!.variant_group_id
    ).toBe(500);
  });

  it('joins a product that is in the group already, without harm', async () => {
    await addVariantItem('vg-1', 'p1');
    await addVariantItem('vg-1', 'p1');
    expect(
      db.tables.product.filter((p) => p.variant_group_id === 500)
    ).toHaveLength(2);
  });

  it('refuses a group that does not exist, and a product of another attribute group', async () => {
    const e1 = await refusal(addVariantItem('nope', 'p1'));
    expect(e1.code).toBe('GROUP_NOT_FOUND');
    expect(e1.message).toBe('Invalid variant group');
    for (const uuid of ['nope', 'p4']) {
      // eslint-disable-next-line no-await-in-loop
      const e2 = await refusal(addVariantItem('vg-1', uuid));
      expect(e2.code).toBe('PRODUCT_NOT_ELIGIBLE');
      expect(e2.message).toBe(
        'The product is either not exist or using different attribute group'
      );
    }
    expect(db.updates).toEqual([]);
  });

  it('gives the connection back after a success, a refusal and an error', async () => {
    await addVariantItem('vg-1', 'p1');
    expect(db.tx).toMatchObject({ started: 1, committed: 1, open: 0 });

    await refusal(addVariantItem('nope', 'p1'));
    await refusal(addVariantItem('vg-1', 'p4'));
    expect(db.tx).toMatchObject({ started: 3, rolledBack: 2, open: 0 });

    db.failOn.product_attribute_value_index = new Error('deadlock detected');
    const e = await refusal(addVariantItem('vg-1', 'p1'));
    expect(e.message).toBe('deadlock detected');
    expect(db.tx).toMatchObject({ started: 4, rolledBack: 3, open: 0 });
  });

  it('writes nothing visible to the caller when it fails halfway', async () => {
    db.failOn.product_attribute_value_index = new Error('deadlock detected');
    await refusal(addVariantItem('vg-1', 'p1'));
    // the fake does not undo writes (a database does at the rollback), so the
    // test checks that the rollback was asked for and the commit was not
    expect(db.tx.committed).toBe(0);
    expect(db.tx.rolledBack).toBe(1);
  });
});

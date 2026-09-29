import { jest } from '@jest/globals';

/**
 * Which attributes drive a variant group is the seed data's decision. Colour
 * used to be hardcoded as the only axis, so size could never be a variant for a
 * fashion catalogue and no other industry could express its own.
 */
const productRows = new Map<string, { variant_group_id: number | null }>();
const attributeRows = new Map<string, { attribute_id: number; sort_order: number }>();
const inserted: any[] = [];

const selectBuilder = () => {
  const state: { table?: string; value?: unknown } = {};
  const api: any = {
    from(t: string) {
      state.table = t;
      return api;
    },
    where(_f: string, _op: string, value: unknown) {
      state.value = value;
      return api;
    },
    and: () => api,
    async load() {
      if (state.table === 'attribute') {
        return attributeRows.get(String(state.value)) ?? null;
      }
      return productRows.get(String(state.value)) ?? null;
    }
  };
  return api;
};

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({
  select: () => selectBuilder(),
  insert: () => ({
    given(data: any) {
      return {
        async execute() {
          inserted.push(data);
          return { insertId: 100 + inserted.length };
        }
      };
    }
  })
}));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {}
}));
const warnings: string[] = [];
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  info: () => undefined,
  success: () => undefined,
  warning: (m: string) => warnings.push(m),
  error: () => undefined
}));

const { createVariantGroups, loadSeedAttributes, axesFor } = await import(
  '../../variantGroupHelpers.js'
);

const attrs = (...defs: [string, number, number, boolean][]) =>
  new Map(
    defs.map(([code, id, sortOrder, isVariant]) => [
      code,
      { code, attributeId: id, sortOrder, isVariant }
    ])
  );

const product = (sku: string, group: string | null, ...pairs: [string, string][]) => ({
  sku,
  ...(group ? { variant_group: group } : {}),
  attributes: pairs.map(([attribute_code, value]) => ({ attribute_code, value }))
});

const COLOUR_AND_SIZE = attrs(['color', 1, 10, true], ['size', 2, 20, true]);

beforeEach(() => {
  productRows.clear();
  attributeRows.clear();
  inserted.length = 0;
  warnings.length = 0;
});

describe('axesFor', () => {
  it('picks only the attribute the members actually differ on', () => {
    const members = [
      product('A', 'g', ['color', 'Navy'], ['size', 'M']),
      product('B', 'g', ['color', 'Gray'], ['size', 'M'])
    ];
    expect(axesFor(members, COLOUR_AND_SIZE, 'g').map((a) => a.code)).toEqual([
      'color'
    ]);
  });

  it('makes size an axis when that is what varies', () => {
    const members = [
      product('A', 'g', ['color', 'Navy'], ['size', 'S']),
      product('B', 'g', ['color', 'Navy'], ['size', 'M'])
    ];
    expect(axesFor(members, COLOUR_AND_SIZE, 'g').map((a) => a.code)).toEqual([
      'size'
    ]);
  });

  it('supports two axes at once, ordered by sort_order', () => {
    const members = [
      product('A', 'g', ['color', 'Navy'], ['size', 'S']),
      product('B', 'g', ['color', 'Gray'], ['size', 'M'])
    ];
    expect(axesFor(members, COLOUR_AND_SIZE, 'g').map((a) => a.code)).toEqual([
      'color',
      'size'
    ]);
  });

  it('ignores an attribute the data has not marked is_variant', () => {
    const notVariant = attrs(['color', 1, 10, false], ['size', 2, 20, true]);
    const members = [
      product('A', 'g', ['color', 'Navy'], ['size', 'M']),
      product('B', 'g', ['color', 'Gray'], ['size', 'M'])
    ];
    expect(axesFor(members, notVariant, 'g')).toEqual([]);
  });

  it('skips and reports an axis only some members declare', () => {
    const members = [
      product('A', 'g', ['color', 'Navy'], ['size', 'M']),
      product('B', 'g', ['size', 'L'])
    ];
    expect(axesFor(members, COLOUR_AND_SIZE, 'g').map((a) => a.code)).toEqual([
      'size'
    ]);
    expect(warnings.join(' ')).toContain('not every member declares "color"');
  });

  it('caps at the five axis columns a variant group has', () => {
    const many = attrs(
      ['a', 1, 10, true], ['b', 2, 20, true], ['c', 3, 30, true],
      ['d', 4, 40, true], ['e', 5, 50, true], ['f', 6, 60, true]
    );
    const members = [
      product('A', 'g', ['a','1'],['b','1'],['c','1'],['d','1'],['e','1'],['f','1']),
      product('B', 'g', ['a','2'],['b','2'],['c','2'],['d','2'],['e','2'],['f','2'])
    ];
    expect(axesFor(members, many, 'g')).toHaveLength(5);
    expect(warnings.join(' ')).toContain('varies on 6 attributes');
  });
});

describe('createVariantGroups', () => {
  const DATA = [
    product('TEE-WHT', 'heavy-tee', ['color', 'White'], ['size', 'M']),
    product('TEE-BLK', 'heavy-tee', ['color', 'Black'], ['size', 'M']),
    product('SHT-S', 'oxford', ['color', 'White'], ['size', 'S']),
    product('SHT-M', 'oxford', ['color', 'White'], ['size', 'M']),
    product('BAG-TOTE', null, ['color', 'Beige'])
  ];

  it('writes the axes into the right columns and nulls the rest', async () => {
    await createVariantGroups(DATA, 1, COLOUR_AND_SIZE);
    const tee = inserted.find((d) => d.attribute_one === 1);
    expect(tee).toMatchObject({
      attribute_one: 1, attribute_two: null, attribute_three: null,
      attribute_four: null, attribute_five: null, attribute_group_id: 1
    });
  });

  it('gives each group the axis its own members vary on', async () => {
    await createVariantGroups(DATA, 1, COLOUR_AND_SIZE);
    expect(inserted).toHaveLength(2);
    // heavy-tee varies on colour, oxford varies on size
    expect(inserted.map((d) => d.attribute_one).sort()).toEqual([1, 2]);
  });

  it('ignores products that declare no group', async () => {
    const ids = await createVariantGroups(DATA, 1, COLOUR_AND_SIZE);
    expect([...ids.keys()].sort()).toEqual(['heavy-tee', 'oxford']);
  });

  it('reuses the group its members already belong to', async () => {
    productRows.set('TEE-BLK', { variant_group_id: 42 });
    const ids = await createVariantGroups(DATA, 1, COLOUR_AND_SIZE);
    expect(ids.get('heavy-tee')).toBe(42);
    expect(inserted).toHaveLength(1);
  });

  it('inserts nothing on a second seed of the same data', async () => {
    productRows.set('TEE-WHT', { variant_group_id: 42 });
    productRows.set('SHT-S', { variant_group_id: 43 });
    await createVariantGroups(DATA, 1, COLOUR_AND_SIZE);
    expect(inserted).toHaveLength(0);
  });

  it('warns rather than silently creating a group with no picker', async () => {
    const flat = [
      product('X', 'g', ['color', 'Navy'], ['size', 'M']),
      product('Y', 'g', ['color', 'Navy'], ['size', 'M'])
    ];
    await createVariantGroups(flat, 1, COLOUR_AND_SIZE);
    expect(inserted[0].attribute_one).toBeNull();
    expect(warnings.join(' ')).toContain('vary on no variant attribute');
  });

  it('does nothing at all when no product declares a group', async () => {
    await createVariantGroups([product('BAG', null, ['color', 'Beige'])], 1, COLOUR_AND_SIZE);
    expect(inserted).toHaveLength(0);
  });
});

describe('loadSeedAttributes', () => {
  it('carries the is_variant flag and sort order from the seed file', async () => {
    attributeRows.set('color', { attribute_id: 7, sort_order: 10 });
    attributeRows.set('size', { attribute_id: 8, sort_order: 20 });
    const loaded = await loadSeedAttributes([
      { attribute_code: 'color', sort_order: 10, is_variant: true },
      { attribute_code: 'size', sort_order: 20 }
    ]);
    expect(loaded.get('color')).toMatchObject({ attributeId: 7, isVariant: true });
    expect(loaded.get('size')).toMatchObject({ attributeId: 8, isVariant: false });
  });

  it('skips an attribute the database does not have yet', async () => {
    const loaded = await loadSeedAttributes([{ attribute_code: 'ghost' }]);
    expect(loaded.size).toBe(0);
  });
});

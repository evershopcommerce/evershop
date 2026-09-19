import { buildMetaDataUpdate } from '../../metaDataSql.js';

const entityOpts = {
  table: 'product',
  whereClause: 'product_id = $1',
  idParams: [42],
  namespace: 'specs',
  key: 'color'
};

describe('buildMetaDataUpdate — merge branch (defined value)', () => {
  test('casts the jsonb_build_object key param so the statement can parse', () => {
    const { sql } = buildMetaDataUpdate({ ...entityOpts, validated: 'red' });
    expect(sql).toContain('jsonb_build_object($3::text, $4::jsonb)');
  });

  test('keeps the jsonb_set namespace-creating merge shape', () => {
    const { sql } = buildMetaDataUpdate({ ...entityOpts, validated: 'red' });
    expect(sql).toContain('SET meta_data = jsonb_set(');
    expect(sql).toContain("COALESCE(meta_data -> $2, '{}'::jsonb)");
    expect(sql).toContain('WHERE product_id = $1');
    expect(sql).toContain('UPDATE "product"');
  });

  test('binds id params first, then namespace, key, JSON-stringified value', () => {
    const { params } = buildMetaDataUpdate({
      ...entityOpts,
      validated: { size: 'L' }
    });
    expect(params).toEqual([42, 'specs', 'color', '{"size":"L"}']);
  });

  test('null is a stored value (JSON null), not a removal — only undefined removes', () => {
    const { sql, params } = buildMetaDataUpdate({
      ...entityOpts,
      validated: null
    });
    expect(sql).toContain('jsonb_set');
    expect(params[3]).toBe('null');
  });
});

describe('buildMetaDataUpdate — remove branch (undefined = blank)', () => {
  test('removes the key with #- instead of storing a JSON null', () => {
    const { sql, params } = buildMetaDataUpdate({
      ...entityOpts,
      validated: undefined
    });
    expect(sql).toContain('SET meta_data = meta_data #- ARRAY[$2::text, $3::text]');
    expect(sql).not.toContain('jsonb_set');
    expect(params).toEqual([42, 'specs', 'color']);
  });
});

describe('buildMetaDataUpdate — param offsets and quoting', () => {
  test('shop singleton (no id params) numbers from $1', () => {
    const shop = {
      table: 'metafield_shop',
      whereClause: 'id = true',
      idParams: [],
      namespace: 'custom',
      key: 'copyright'
    };
    const merge = buildMetaDataUpdate({ ...shop, validated: '© EverShop' });
    expect(merge.sql).toContain('jsonb_build_object($2::text, $3::jsonb)');
    expect(merge.sql).toContain("COALESCE(meta_data -> $1, '{}'::jsonb)");
    expect(merge.params).toEqual(['custom', 'copyright', '"© EverShop"']);

    const remove = buildMetaDataUpdate({ ...shop, validated: undefined });
    expect(remove.sql).toContain('#- ARRAY[$1::text, $2::text]');
    expect(remove.params).toEqual(['custom', 'copyright']);
  });

  test('reserved-word tables are double-quoted', () => {
    const { sql } = buildMetaDataUpdate({
      table: 'order',
      whereClause: 'order_id = $1',
      idParams: [7],
      namespace: 'ops',
      key: 'gift_note',
      validated: 'yes'
    });
    expect(sql).toContain('UPDATE "order"');
  });
});

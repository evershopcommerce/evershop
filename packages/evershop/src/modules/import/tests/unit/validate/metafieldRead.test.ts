import { createHash } from 'crypto';
import { describe, expect, it } from '@jest/globals';
import {
  mergeMetaData,
  missingRequired,
  readMetafields
} from '../../../services/entities/metafields.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';

/**
 * The custom-field cells of a row: read, checked by the store, and put together
 * with what is stored (§ 5.9). The definitions come from `MemoryLookup`, whose
 * check is core's own.
 */
const lookup = new MemoryLookup({
  metafieldDefinitions: {
    product: [
      { namespace: 'custom', key: 'material', type: 'short_text' },
      { namespace: 'custom', key: 'years', type: 'integer', required: true },
      {
        namespace: 'custom',
        key: 'warranty',
        type: 'integer',
        validations: [{ type: 'range', min: 0, max: 10 }]
      },
      {
        namespace: 'custom',
        key: 'specs',
        type: 'group',
        subFields: [{ key: 'fit', type: 'short_text', required: true }]
      },
      { namespace: 'seo', key: 'title', type: 'short_text' },
      { namespace: 'custom', key: 'tags', type: 'short_text', isList: true }
    ]
  }
});
const definitions = await lookup.metafields('product');
const deps = {
  now: 1_760_000_000_000,
  sha256Hex: (text: string) => createHash('sha256').update(text).digest('hex')
};

const read = (cells: Record<string, string> | undefined) =>
  readMetafields({ rowNumber: 5, cells, definitions, deps });

describe('readMetafields', () => {
  it('gives the values of the cells in {namespace: {key: value}}', () => {
    expect(
      read({
        'custom.material': 'Cotton',
        'custom.years': '3',
        'seo.title': 'Tee',
        'custom.specs': '{"fit":"Slim"}'
      })
    ).toEqual({
      values: {
        custom: { material: 'Cotton', years: 3, specs: { fit: 'Slim' } },
        seo: { title: 'Tee' }
      },
      issues: []
    });
  });

  it('leaves out a cell that comes to nothing, such as a list of empty items', () => {
    expect(read({ 'custom.tags': '|' })).toStrictEqual({
      values: {},
      issues: []
    });
  });

  it('says nothing for a row without cells, and skips a cell with no definition', () => {
    expect(read(undefined)).toEqual({ values: {}, issues: [] });
    expect(read({ 'custom.nope': 'x' })).toEqual({ values: {}, issues: [] });
  });

  it('collects the problem of every column, and keeps the cells that are good (MET-06)', () => {
    const result = read({
      'custom.material': 'Cotton',
      'custom.years': 'many',
      'custom.warranty': '99',
      'custom.specs': '{oops'
    });
    expect(result.values).toEqual({ custom: { material: 'Cotton' } });
    expect(
      result.issues.map((i) => [i.code, i.column, i.rowNumber, i.value])
    ).toEqual([
      ['METAFIELD_INVALID', 'metafield:custom.years', 5, 'many'],
      ['METAFIELD_INVALID', 'metafield:custom.warranty', 5, '99'],
      ['INVALID_JSON', 'metafield:custom.specs', 5, '{oops']
    ]);
    // the message of a value the store refuses names the field
    expect(result.issues[1].message).toContain('"custom.warranty"');
  });

  it('gives the sentence of a cell that cannot be read', () => {
    const [issue] = read({ 'custom.years': '1.5' }).issues;
    expect(issue.message).toBe(
      'The value in column "metafield:custom.years" must be a whole number, such as 12 or -3.'
    );
    expect(issue.params).toMatchObject({
      reason: 'not_integer',
      field: 'custom.years'
    });
  });
});

describe('missingRequired (MET-04)', () => {
  const missing = (over: Partial<Parameters<typeof missingRequired>[0]> = {}) =>
    missingRequired({
      rowNumber: 5,
      key: 'TSH-1',
      creates: true,
      cells: undefined,
      stored: null,
      definitions,
      ...over
    }).map((issue) => [issue.code, issue.column]);

  it('asks a new record for a required field it has no cell for', () => {
    expect(missing()).toEqual([['MISSING_REQUIRED', 'metafield:custom.years']]);
    expect(missing({ cells: { 'custom.years': '3' } })).toEqual([]);
  });

  it('counts the stored value on an update, and asks when there is none', () => {
    expect(
      missing({ creates: false, stored: { custom: { years: 4 } } })
    ).toEqual([]);
    expect(missing({ creates: false, stored: {} })).toEqual([
      ['MISSING_REQUIRED', 'metafield:custom.years']
    ]);
    // a stored value does not excuse a new record
    expect(
      missing({ creates: true, stored: { custom: { years: 4 } } })
    ).toEqual([['MISSING_REQUIRED', 'metafield:custom.years']]);
  });
});

describe('mergeMetaData', () => {
  it('lays the new values over the stored set, key by key, and does not touch the stored object', () => {
    const stored = { custom: { material: 'Wool', years: 5 }, other: { n: 1 } };
    const merged = mergeMetaData(stored, {
      custom: { material: 'Cotton' },
      seo: { title: 'Tee' }
    });
    expect(merged).toEqual({
      custom: { material: 'Cotton', years: 5 },
      other: { n: 1 },
      seo: { title: 'Tee' }
    });
    expect(stored).toEqual({
      custom: { material: 'Wool', years: 5 },
      other: { n: 1 }
    });
    merged.custom.years = 99;
    expect(stored.custom.years).toBe(5);
  });

  it('takes nothing for a record that has none stored', () => {
    expect(mergeMetaData(null, { custom: { a: 1 } })).toEqual({
      custom: { a: 1 }
    });
    expect(mergeMetaData(undefined, {})).toEqual({});
  });
});

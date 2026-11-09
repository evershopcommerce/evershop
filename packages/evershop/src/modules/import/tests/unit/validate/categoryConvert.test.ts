import { describe, it, expect } from '@jest/globals';
import { createHash } from 'crypto';
import { categoryValidator } from '../../../services/entities/category/categoryValidator.js';
import type { HeaderInfo } from '../../../services/entities/definition.js';
import { MemoryLookup } from '../../../testing/MemoryLookup.js';
import type { CsvRow } from '../../../services/reader/readCsv.js';

/**
 * The conversion of one row (layer C), without the store: what a category row
 * says, typed, and the issues of its cells.
 */
const COLUMNS = [
  'url_key',
  'name',
  'parent',
  'status',
  'position',
  'description'
];
const header: HeaderInfo = {
  columns: COLUMNS,
  position: new Map(COLUMNS.map((name, at) => [name, at]))
};
const ctx = {
  lookup: new MemoryLookup(),
  mode: 'upsert' as const,
  now: () => 1_760_000_000_000,
  sha256Hex: (text: string) => createHash('sha256').update(text).digest('hex')
};

const convert = (cells: string[], rowNumber = 2, hasError = false) =>
  categoryValidator.convert(
    { rowNumber, cells, hasError } as CsvRow,
    header,
    ctx
  );

describe('categoryValidator.convert', () => {
  it('types the cells and leaves a blank cell out: "not provided"', () => {
    const row = convert(['women', 'Women', 'Top', '1', '007', '']);
    expect(row).toMatchObject({
      rowNumber: 2,
      key: 'women',
      example: false,
      broken: false,
      invalid: [],
      issues: [],
      data: {
        url_key: 'women',
        name: 'Women',
        parent: 'top',
        status: 1,
        position: '7'
      }
    });
    expect('description' in row.data).toBe(false);
    expect(convert(['women', '', '', '', '', '']).data).toEqual({
      url_key: 'women'
    });
  });

  it('trims the cells and escapes the text of a name, but not a description', () => {
    const row = convert([
      '  women ',
      ' <b>Sale</b> ',
      '',
      ' 0 ',
      '',
      '<p>Hi</p>'
    ]);
    expect(row.data.name).toBe('&lt;b&gt;Sale&lt;/b&gt;');
    expect(row.data.status).toBe(0);
    expect(row.key).toBe('women');
    const html = row.data.description?.[0].columns[0].data.blocks[0];
    expect(html).toMatchObject({ type: 'raw', data: { html: '<p>Hi</p>' } });
  });

  it('writes a description with the time and the hash it was given', () => {
    const row = convert(['women', 'Women', '', '1', '', 'Soft cotton tee']);
    expect(row.data.description?.[0]).toMatchObject({
      id: 'rd88ab6ab',
      columns: [{ data: { time: 1_760_000_000_000 } }]
    });
  });

  it('derives the key from the name as it was typed, not as it is stored escaped', () => {
    const row = convert(['', '<b>Sale</b> Items', '', '1', '', '']);
    expect(row.key).toBe('b-sale-b-items');
    expect(row.data.url_key).toBe('b-sale-b-items');
    expect(row.data.name).toBe('&lt;b&gt;Sale&lt;/b&gt; Items');
  });

  it('says why a key cannot be had: no name at all, or a name with nothing to make a key of', () => {
    const none = convert(['', '', '', '1', '', '']);
    expect(none.key).toBeNull();
    expect(none.issues).toMatchObject([
      { code: 'MISSING_REQUIRED', params: { reason: 'no_key_and_no_name' } }
    ]);
    const unreadable = convert(['', '黑色星期五', '', '1', '', '']);
    expect(unreadable.key).toBeNull();
    expect(unreadable.issues).toMatchObject([
      {
        code: 'MISSING_REQUIRED',
        params: { reason: 'cannot_derive' },
        value: '黑色星期五'
      }
    ]);
  });

  it('keeps the key the file wrote, and refuses one that is not a key', () => {
    expect(convert(['  Women  ', 'x', '', '1', '', '']).key).toBeNull();
    expect(convert(['women-2', 'x', '', '1', '', '']).key).toBe('women-2');
    const bad = convert(['a--b', 'x', '', '1', '', '']);
    expect(bad.issues).toMatchObject([
      {
        code: 'INVALID_VALUE',
        column: 'url_key',
        params: { reason: 'pattern' }
      }
    ]);
    const long = convert(['a'.repeat(256), 'x', '', '1', '', '']);
    expect(long.issues[0].params).toEqual({ reason: 'too_long' });
  });

  it('remembers which columns it could not read, so that nobody says they are missing', () => {
    const row = convert(['women', 'Women', '', 'maybe', '-5', '']);
    expect(row.invalid).toEqual(['status', 'position']);
    expect(row.issues.map((issue) => issue.column)).toEqual([
      'status',
      'position'
    ]);
    expect(row.data.status).toBeUndefined();
    expect(row.data.position).toBeUndefined();
  });

  it('takes a row of the template as an example and reads no further', () => {
    const row = convert(['example-subcategory', '', '', 'maybe', '-5', '']);
    expect(row).toMatchObject({ example: true, key: 'example-subcategory' });
    expect(row.issues).toMatchObject([
      { code: 'TEMPLATE_EXAMPLE_ROW', severity: 'warning', column: 'url_key' }
    ]);
  });

  it('leaves a row the reader refused alone', () => {
    expect(convert(['women', 'Women'], 2, false)).toMatchObject({
      broken: true,
      key: null,
      issues: []
    });
    expect(convert(['women', 'Women', '', '1', '', ''], 2, true).broken).toBe(
      true
    );
  });
});

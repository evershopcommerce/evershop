import { createHash } from 'crypto';
import { describe, expect, it } from '@jest/globals';
import { convertMetafieldCell } from '../../../services/cells/metafieldCell.js';
import type {
  MetafieldField,
  MetafieldType
} from '../../../services/ports/lookup.js';

/**
 * A custom-field cell read as a value of its definition (§ 5.9): every type, a
 * list, a group, rich text. Whether the value passes the validations of the
 * definition is the check of the store, tested with `readMetafields`.
 */
const deps = {
  now: 1_760_000_000_000,
  sha256Hex: (text: string) => createHash('sha256').update(text).digest('hex')
};

const field = (
  type: MetafieldType,
  more: Partial<MetafieldField> = {}
): MetafieldField => ({
  key: 'f',
  type,
  isList: false,
  required: false,
  subFields: [],
  ...more
});

const read = (f: MetafieldField, text: string) =>
  convertMetafieldCell(f, text, deps);

describe('convertMetafieldCell: scalars', () => {
  it.each([
    ['short_text', 'Organic cotton', 'Organic cotton'],
    ['long_text', 'Line one\nLine two', 'Line one\nLine two'],
    ['url', 'https://example.com/a?b=1#c', 'https://example.com/a?b=1#c'],
    ['url', 'mailto:help@example.com', 'mailto:help@example.com'],
    ['integer', '42', 42],
    ['integer', '-3', -3],
    ['integer', '007', 7],
    ['number', '2.5', 2.5],
    ['number', '-0.25', -0.25],
    ['number', '12', 12],
    ['boolean', 'true', true],
    ['boolean', 'FALSE', false],
    ['boolean', '1', true],
    ['boolean', '0', false],
    ['date', '2026-03-01', '2026-03-01'],
    ['color', '#aA00ff', '#aA00ff']
  ] as Array<[MetafieldType, string, unknown]>)(
    'reads %s %j as %j',
    (type, text, expected) => {
      expect(read(field(type), text)).toEqual({ ok: true, value: expected });
    }
  );

  it.each([
    ['integer', '1.5'],
    ['integer', 'abc'],
    ['integer', '1,000'],
    ['integer', '9007199254740993'],
    ['integer', '+3'],
    ['number', '2,5'],
    ['number', '.5'],
    ['number', '1e3'],
    ['number', 'x'],
    ['boolean', 'yes'],
    ['boolean', '2'],
    ['date', '2026-02-30'],
    ['date', '03/01/2026'],
    ['color', '#fff'],
    ['color', 'red'],
    ['url', 'example.com'],
    ['url', 'https://exa mple.com'],
    ['url', 'https://example.com\n']
  ] as Array<[MetafieldType, string]>)(
    'refuses %s %j with INVALID_VALUE',
    (type, text) => {
      const result = read(field(type), text);
      expect(result).toMatchObject({ ok: false, code: 'INVALID_VALUE' });
      expect((result as { problem: string }).problem.length).toBeGreaterThan(5);
    }
  );
});

describe('convertMetafieldCell: lists', () => {
  it('splits a list of scalars on | and reads every item', () => {
    expect(read(field('integer', { isList: true }), '36|38|40')).toEqual({
      ok: true,
      value: [36, 38, 40]
    });
    expect(read(field('short_text', { isList: true }), ' a | b ')).toEqual({
      ok: true,
      value: ['a', 'b']
    });
  });

  it('drops empty items, and a list with none is an empty list', () => {
    expect(read(field('short_text', { isList: true }), 'a||b|')).toEqual({
      ok: true,
      value: ['a', 'b']
    });
    expect(read(field('short_text', { isList: true }), '|')).toEqual({
      ok: true,
      value: []
    });
  });

  it('names the item that cannot be read', () => {
    const result = read(field('integer', { isList: true }), '1|x|3');
    expect(result).toMatchObject({
      ok: false,
      code: 'INVALID_VALUE',
      params: { reason: 'not_integer', item: 2 }
    });
    expect((result as { problem: string }).problem).toContain('item 2');
  });
});

// A group with the two sub-fields the examples use.
const SUBS: MetafieldField[] = [
  { ...field('short_text'), key: 'fit', required: true },
  { ...field('integer'), key: 'gsm' }
];
const group = (more: Partial<MetafieldField> = {}) =>
  field('group', { subFields: SUBS, ...more });

describe('convertMetafieldCell: groups and rich text', () => {
  it('reads a group as a JSON object and a list of groups as a JSON array', () => {
    expect(read(group(), '{"fit":"Relaxed","gsm":180}')).toEqual({
      ok: true,
      value: { fit: 'Relaxed', gsm: 180 }
    });
    expect(read(group({ isList: true }), '[{"fit":"a"},{"fit":"b"}]')).toEqual({
      ok: true,
      value: [{ fit: 'a' }, { fit: 'b' }]
    });
  });

  it('refuses a key that is not a sub-field of the definition (core would drop it without a word)', () => {
    // The names are case-sensitive, so a wrong case is an unknown key.
    expect(read(group(), '{"Fit":"Relaxed","gsm":180}')).toMatchObject({
      ok: false,
      code: 'INVALID_VALUE',
      params: { reason: 'unknown_sub_field', key: 'Fit' }
    });
    expect(read(group(), '{"fit":"a","gsmm":1}')).toMatchObject({
      ok: false,
      params: { reason: 'unknown_sub_field', key: 'gsmm' }
    });
    expect(
      read(group({ isList: true }), '[{"fit":"a"},{"bogus":1}]')
    ).toMatchObject({
      ok: false,
      params: { reason: 'unknown_sub_field', key: 'bogus' }
    });
    // A group with no sub-fields has nothing a key could be.
    expect(read(field('group'), '{"fit":"a"}')).toMatchObject({
      ok: false,
      params: { reason: 'unknown_sub_field' }
    });
  });

  it('refuses an entry of a list of groups that is not an object', () => {
    expect(
      read(group({ isList: true }), '[{"fit":"a"}, "text"]')
    ).toMatchObject({
      ok: false,
      params: { reason: 'not_object' }
    });
    expect(read(group({ isList: true }), '[{"fit":"a"}, null]')).toMatchObject({
      ok: false,
      params: { reason: 'not_object' }
    });
  });

  it('checks a group inside a group by its own definition', () => {
    const nested = field('group', {
      subFields: [
        {
          ...field('group'),
          key: 'size',
          subFields: [{ ...field('integer'), key: 'w' }]
        },
        {
          ...field('group', { isList: true }),
          key: 'parts',
          subFields: [{ ...field('integer'), key: 'n' }]
        }
      ]
    });
    expect(read(nested, '{"size":{"w":3},"parts":[{"n":1}]}')).toMatchObject({
      ok: true
    });
    expect(read(nested, '{"size":{"W":3}}')).toMatchObject({
      ok: false,
      params: { reason: 'unknown_sub_field', key: 'W' }
    });
    expect(read(nested, '{"parts":{"n":1}}')).toMatchObject({
      ok: false,
      params: { reason: 'not_array', key: 'parts' }
    });
    expect(read(nested, '{"parts":[{"x":1}]}')).toMatchObject({
      ok: false,
      params: { reason: 'unknown_sub_field', key: 'x' }
    });
  });

  it('refuses JSON that does not parse, and JSON of the wrong shape', () => {
    expect(read(group(), '{fit: 1}')).toMatchObject({
      ok: false,
      code: 'INVALID_JSON'
    });
    expect(read(group(), '[1]')).toMatchObject({
      ok: false,
      code: 'INVALID_VALUE',
      params: { reason: 'not_object' }
    });
    expect(read(group({ isList: true }), '{"a":1}')).toMatchObject({
      ok: false,
      params: { reason: 'not_array' }
    });
  });

  it('drops a __proto__ key of a group', () => {
    const result = read(group(), '{"__proto__":{"x":1},"fit":"a"}');
    expect(result).toEqual({ ok: true, value: { fit: 'a' } });
  });

  it('reads rich text as the blocks of the editor, paragraphs and HTML', () => {
    const text = read(field('rich_text'), 'One\n\nTwo') as {
      ok: true;
      value: Array<{ columns: Array<{ data: { blocks: unknown[] } }> }>;
    };
    expect(text.ok).toBe(true);
    expect(text.value[0].columns[0].data.blocks).toHaveLength(2);
    const html = read(field('rich_text'), '<p>Hi</p>') as typeof text;
    expect(html.value[0].columns[0].data.blocks).toEqual([
      expect.objectContaining({ type: 'raw', data: { html: '<p>Hi</p>' } })
    ]);
  });

  it('reads a list of rich texts as JSON', () => {
    expect(
      read(field('rich_text', { isList: true }), '[{"content":[]}]')
    ).toEqual({ ok: true, value: [{ content: [] }] });
    expect(read(field('rich_text', { isList: true }), 'plain')).toMatchObject({
      ok: false,
      code: 'INVALID_JSON'
    });
    // An item that is not a document would be dropped.
    for (const text of [
      '["Hello"]',
      '[{"content":"x"}]',
      '[{"text":[]}]',
      '[null]'
    ]) {
      expect(read(field('rich_text', { isList: true }), text)).toMatchObject({
        ok: false,
        params: { reason: 'not_document' }
      });
    }
  });

  it('refuses a type it does not know', () => {
    expect(read(field('weird' as never), 'x')).toMatchObject({
      ok: false,
      params: { reason: 'unsupported_type' }
    });
  });
});

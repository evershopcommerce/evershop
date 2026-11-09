import { describe, expect, it, jest } from '@jest/globals';
import type { MetafieldDefinition } from '../../types.js';

/**
 * `createFieldValidator`: the check of one definition, compiled once and applied
 * to any number of values, which `validateMetafields` and `validateMetafield` are
 * made of. No database: the definitions of the last two are replaced.
 */
const defs: MetafieldDefinition[] = [];
jest.unstable_mockModule('../../definition.js', () => ({
  listMetafieldDefinitions: async () => defs,
  rowToDefinition: (row: unknown) => row
}));

const { createFieldValidator, validateMetafield, validateMetafields } =
  await import('../../validate.js');

const definition = (
  over: Partial<MetafieldDefinition> & { key: string }
): MetafieldDefinition => ({
  uuid: `uuid-${over.key}`,
  ownerType: 'product',
  namespace: 'custom',
  name: over.key,
  type: 'short_text',
  visibleToCustomer: false,
  position: 0,
  ...over
});

const check = (over: Partial<MetafieldDefinition> & { key: string }) =>
  createFieldValidator(definition(over));

describe('createFieldValidator: blank and required', () => {
  it.each([undefined, null, ''])(
    '%p is "not provided" for an optional field',
    (blank) => {
      expect(check({ key: 'material' })(blank)).toEqual({
        ok: true,
        value: undefined
      });
    }
  );

  it('refuses a blank value of a required field, and names the field', () => {
    expect(check({ key: 'material', required: true })('')).toEqual({
      ok: false,
      message: '"custom.material" is required'
    });
  });

  it('keeps a value that looks blank but is not: false and 0', () => {
    expect(check({ key: 'eco', type: 'boolean' })(false)).toEqual({
      ok: true,
      value: false
    });
    expect(check({ key: 'years', type: 'integer' })(0)).toEqual({
      ok: true,
      value: 0
    });
  });
});

describe('createFieldValidator: the types', () => {
  it('accepts a value of the type and gives it back', () => {
    expect(check({ key: 'material' })('Cotton')).toEqual({
      ok: true,
      value: 'Cotton'
    });
    expect(check({ key: 'years', type: 'integer' })(3)).toEqual({
      ok: true,
      value: 3
    });
    expect(check({ key: 'rate', type: 'number' })(2.5)).toEqual({
      ok: true,
      value: 2.5
    });
    expect(check({ key: 'when', type: 'date' })('2026-03-01')).toEqual({
      ok: true,
      value: '2026-03-01'
    });
    expect(check({ key: 'tone', type: 'color' })('#aa00FF')).toEqual({
      ok: true,
      value: '#aa00FF'
    });
  });

  it.each([
    [
      'an integer given a fraction',
      { key: 'years', type: 'integer' as const },
      1.5
    ],
    [
      'an integer given a word',
      { key: 'years', type: 'integer' as const },
      'x'
    ],
    ['a boolean given a word', { key: 'eco', type: 'boolean' as const }, 'yes'],
    [
      'a date that is not a date',
      { key: 'when', type: 'date' as const },
      '2026-02-30'
    ],
    [
      'a color with a short code',
      { key: 'tone', type: 'color' as const },
      '#fff'
    ],
    [
      'a text given a number',
      { key: 'material', type: 'short_text' as const },
      5
    ]
  ])(
    'refuses %s, with the name of the field in the message',
    (_name, over, value) => {
      const result = check(over)(value);
      expect(result.ok).toBe(false);
      expect((result as { message: string }).message).toMatch(
        new RegExp(`^"custom\\.${over.key}": `)
      );
    }
  );
});

describe('createFieldValidator: validations', () => {
  it('applies size, range, regexp and choices', () => {
    const size = check({
      key: 'code',
      validations: [{ type: 'size', min: 2, max: 4 }]
    });
    expect(size('abc').ok).toBe(true);
    expect(size('a').ok).toBe(false);
    expect(size('abcde').ok).toBe(false);

    const range = check({
      key: 'years',
      type: 'integer',
      validations: [{ type: 'range', min: 0, max: 10 }]
    });
    expect(range(10).ok).toBe(true);
    expect(range(11).ok).toBe(false);
    expect(range(-1).ok).toBe(false);

    const pattern = check({
      key: 'sku',
      validations: [{ type: 'regexp', pattern: '^[A-Z]{3}-\\d+$' }]
    });
    expect(pattern('ABC-12').ok).toBe(true);
    expect(pattern('abc-12').ok).toBe(false);

    const choices = check({
      key: 'fit',
      validations: [{ type: 'choices', values: ['slim', 'relaxed'] }]
    });
    expect(choices('slim').ok).toBe(true);
    expect(choices('baggy').ok).toBe(false);
  });
});

describe('createFieldValidator: lists, groups and rich text', () => {
  it('checks every item of a list, and a list with no items is not provided', () => {
    const tags = check({
      key: 'care',
      isList: true,
      validations: [{ type: 'choices', values: ['wash', 'dry'] }]
    });
    expect(tags(['wash', 'dry'])).toEqual({ ok: true, value: ['wash', 'dry'] });
    expect(tags(['wash', 'iron']).ok).toBe(false);
    expect(tags([])).toEqual({ ok: true, value: undefined });
    // a list is an array: a single text is not a list, so nothing is provided
    expect(tags('wash')).toEqual({ ok: true, value: undefined });
  });

  const specs = definition({
    key: 'specs',
    type: 'group',
    subFields: [
      { key: 'fit', name: 'Fit', type: 'short_text', required: true },
      { key: 'gsm', name: 'Weight', type: 'integer' }
    ]
  });

  it('takes a group, drops what it does not define, and checks the required sub-fields', () => {
    const group = createFieldValidator(specs);
    expect(group({ fit: 'Relaxed', gsm: 180 })).toEqual({
      ok: true,
      value: { fit: 'Relaxed', gsm: 180 }
    });
    // a key that is not a sub-field is dropped
    expect(group({ fit: 'Relaxed', colour: 'red' })).toEqual({
      ok: true,
      value: { fit: 'Relaxed' }
    });
    // a required sub-field that is missing
    expect(group({ gsm: 180 }).ok).toBe(false);
    // a sub-field of the wrong type
    expect(group({ fit: 'Relaxed', gsm: 'heavy' }).ok).toBe(false);
    // a group of empty values is not provided
    expect(group({ fit: '', gsm: '' })).toEqual({ ok: true, value: undefined });
  });

  it('keeps the items of a list of groups without the keys of the editor', () => {
    const list = createFieldValidator({ ...specs, isList: true });
    expect(
      list([
        { _id: 'a', fit: 'Relaxed', gsm: 1 },
        { _id: 'b', fit: 'Slim' }
      ])
    ).toEqual({
      ok: true,
      value: [{ fit: 'Relaxed', gsm: 1 }, { fit: 'Slim' }]
    });
  });

  it('takes the rows of the editor for rich text, and a row with no block is not provided', () => {
    const rich = createFieldValidator(
      definition({ key: 'story', type: 'rich_text' })
    );
    const rows = [
      {
        id: 'r',
        size: 1,
        columns: [
          {
            id: 'c',
            size: 1,
            data: {
              blocks: [{ id: 'b', type: 'paragraph', data: { text: 'Hi' } }]
            }
          }
        ]
      }
    ];
    expect(rich(rows)).toEqual({ ok: true, value: rows });
    const empty = [
      {
        id: 'r',
        size: 1,
        columns: [
          {
            id: 'c',
            size: 1,
            data: {
              blocks: [
                { id: 'b', type: 'paragraph', data: { text: '<p> </p>' } }
              ]
            }
          }
        ]
      }
    ];
    expect(rich(empty)).toEqual({ ok: true, value: undefined });
    expect(
      createFieldValidator(
        definition({ key: 'story', type: 'rich_text', required: true })
      )(empty).ok
    ).toBe(false);
  });

  it('strips the _id keys of the editor from rich text', () => {
    const rich = createFieldValidator(
      definition({ key: 'story', type: 'rich_text' })
    );
    const result = rich([
      {
        _id: 'row',
        id: 'r',
        columns: [
          {
            _id: 'column',
            id: 'c',
            data: {
              blocks: [
                {
                  _id: 'block',
                  id: 'b',
                  type: 'paragraph',
                  data: { text: 'Hi' }
                }
              ]
            }
          }
        ]
      }
    ]);
    expect(JSON.stringify(result)).not.toContain('_id');
    expect(JSON.stringify(result)).toContain('"text":"Hi"');
  });

  it('does not compile the schema of a field nobody gives a value to', () => {
    // A group nested too deep cannot be compiled; an unused definition is not asked.
    const deep = definition({
      key: 'deep',
      type: 'group',
      subFields: [
        {
          key: 'a',
          name: 'a',
          type: 'group',
          subFields: [
            {
              key: 'b',
              name: 'b',
              type: 'group',
              subFields: [{ key: 'c', name: 'c', type: 'short_text' }]
            }
          ]
        }
      ]
    });
    const validator = createFieldValidator(deep);
    expect(validator(undefined)).toEqual({ ok: true, value: undefined });
    expect(() => validator({ a: { b: { c: 'x' } } })).toThrow(
      /nesting exceeds/
    );
  });
});

describe('validateMetafields and validateMetafield, made of it', () => {
  it('returns only the values of defined fields, validated, and throws the first failure with status 400', async () => {
    defs.length = 0;
    defs.push(
      definition({ key: 'material', required: true }),
      definition({ key: 'years', type: 'integer' })
    );
    await expect(
      validateMetafields('product', {
        custom: { material: 'Cotton', years: 3, stray: 'dropped' }
      })
    ).resolves.toEqual({ custom: { material: 'Cotton', years: 3 } });
    // a field with no value is not in the result at all (not even as undefined)
    await expect(
      validateMetafields('product', { custom: { material: 'Cotton' } })
    ).resolves.toStrictEqual({ custom: { material: 'Cotton' } });
    defs.length = 0;
    defs.push(definition({ key: 'years', type: 'integer' }));
    await expect(validateMetafields('product', {})).resolves.toStrictEqual({});
    defs.push(definition({ key: 'material', required: true }));
    await expect(validateMetafields('product', {})).rejects.toMatchObject({
      message: '"custom.material" is required',
      status: 400
    });
    await expect(
      validateMetafields('product', {
        custom: { material: 'x', years: 'many' }
      })
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining('"custom.years"')
    });
  });

  it('checks one value, and refuses a field that has no definition', async () => {
    defs.length = 0;
    defs.push(definition({ key: 'years', type: 'integer' }));
    await expect(
      validateMetafield('product', 'custom', 'years', 4)
    ).resolves.toBe(4);
    await expect(
      validateMetafield('product', 'custom', 'years', '')
    ).resolves.toBeUndefined();
    await expect(
      validateMetafield('product', 'custom', 'nope', 1)
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validateMetafield('product', 'custom', 'years', 'x')
    ).rejects.toMatchObject({ status: 400 });
  });
});

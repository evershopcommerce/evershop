import { getAjv } from '../../../../modules/base/services/getAjv.js';
import { compileField } from '../../compileField.js';
import type { FieldDescriptor, MetafieldType } from '../../types.js';

function ajv() {
  return getAjv();
}

function field(
  over: Partial<FieldDescriptor> & { type: MetafieldType }
): FieldDescriptor {
  return { key: 'k', name: 'K', ...over };
}

describe('compileField — scalars', () => {
  test('text-like types compile to a plain string schema', () => {
    for (const type of ['short_text', 'long_text', 'rich_text', 'url'] as const) {
      expect(compileField(field({ type }))).toEqual({ type: 'string' });
    }
  });

  test('integer / number / boolean', () => {
    expect(compileField(field({ type: 'integer' }))).toEqual({ type: 'integer' });
    expect(compileField(field({ type: 'number' }))).toEqual({ type: 'number' });
    expect(compileField(field({ type: 'boolean' }))).toEqual({ type: 'boolean' });
  });

  test('color is a hex-pattern string', () => {
    const schema = compileField(field({ type: 'color' }));
    const validate = ajv().compile(schema);
    expect(validate('#1a2b3c')).toBe(true);
    expect(validate('#ABCDEF')).toBe(true);
    expect(validate('red')).toBe(false);
    expect(validate('#fff')).toBe(false);
  });

  test('reference is a closed {referenceType, id} object', () => {
    const schema = compileField(field({ type: 'reference', referenceType: 'product' }));
    const validate = ajv().compile(schema);
    expect(validate({ referenceType: 'product', id: 7 })).toBe(true);
    expect(validate({ referenceType: 'product', id: 'uuid-str' })).toBe(true);
    expect(validate({ referenceType: 'product' })).toBe(false); // missing id
    expect(validate({ referenceType: 'product', id: 7, extra: 1 })).toBe(false);
  });

  test('json is unconstrained', () => {
    expect(compileField(field({ type: 'json' }))).toEqual({});
  });
});

describe('compileField — validations', () => {
  test('size -> minLength / maxLength', () => {
    const schema = compileField(
      field({ type: 'short_text', validations: [{ type: 'size', min: 2, max: 5 }] })
    );
    expect(schema).toMatchObject({ type: 'string', minLength: 2, maxLength: 5 });
  });

  test('range -> minimum / maximum', () => {
    const schema = compileField(
      field({ type: 'integer', validations: [{ type: 'range', min: 1, max: 9 }] })
    );
    expect(schema).toMatchObject({ type: 'integer', minimum: 1, maximum: 9 });
  });

  test('regexp -> pattern', () => {
    const schema = compileField(
      field({ type: 'short_text', validations: [{ type: 'regexp', pattern: '^a' }] })
    );
    expect(schema.pattern).toBe('^a');
  });

  test('choices -> enum', () => {
    const schema = compileField(
      field({
        type: 'short_text',
        validations: [{ type: 'choices', values: ['New', 'Sale'] }]
      })
    );
    expect(schema).toEqual({ type: 'string', enum: ['New', 'Sale'] });
  });
});

describe('compileField — isList', () => {
  test('wraps a scalar schema in an array', () => {
    expect(compileField(field({ type: 'short_text', isList: true }))).toEqual({
      type: 'array',
      items: { type: 'string' }
    });
  });

  test('choices + isList -> array with items.enum', () => {
    const schema = compileField(
      field({
        type: 'short_text',
        isList: true,
        validations: [{ type: 'choices', values: ['New', 'Sale'] }]
      })
    );
    expect(schema).toEqual({
      type: 'array',
      items: { type: 'string', enum: ['New', 'Sale'] }
    });
  });
});

describe('compileField — group + depth guard', () => {
  test('group -> closed object; required derives from required sub-fields', () => {
    const schema = compileField(
      field({
        type: 'group',
        subFields: [
          { key: 'q', name: 'Q', type: 'short_text', required: true },
          { key: 'a', name: 'A', type: 'long_text' }
        ]
      })
    );
    expect(schema).toMatchObject({
      type: 'object',
      additionalProperties: false,
      required: ['q']
    });
    expect(Object.keys(schema.properties)).toEqual(['q', 'a']);

    const validate = ajv().compile(schema);
    expect(validate({ q: 'hi', a: 'there' })).toBe(true);
    expect(validate({ a: 'there' })).toBe(false); // missing required q
    expect(validate({ q: 'hi', other: 1 })).toBe(false); // additional prop
  });

  test('group + isList -> array of objects (repeating group)', () => {
    const schema = compileField(
      field({
        type: 'group',
        isList: true,
        subFields: [{ key: 'q', name: 'Q', type: 'short_text' }]
      })
    );
    expect(schema.type).toBe('array');
    expect(schema.items.type).toBe('object');
  });

  test('groups nested two deep (scalars at level 3) are allowed', () => {
    const nested = field({
      type: 'group',
      subFields: [
        {
          key: 'l2',
          name: 'L2',
          type: 'group',
          subFields: [{ key: 'leaf', name: 'Leaf', type: 'short_text' }]
        }
      ]
    });
    expect(() => compileField(nested)).not.toThrow();
  });

  test('a third group level (level 3) throws — max depth 3', () => {
    const tooDeep = field({
      type: 'group',
      subFields: [
        {
          key: 'l2',
          name: 'L2',
          type: 'group',
          subFields: [
            {
              key: 'l3',
              name: 'L3',
              type: 'group',
              subFields: [{ key: 'leaf', name: 'Leaf', type: 'short_text' }]
            }
          ]
        }
      ]
    });
    expect(() => compileField(tooDeep)).toThrow(/max depth 3/);
  });
});

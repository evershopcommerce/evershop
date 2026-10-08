import { describe, it, expect } from '@jest/globals';
import { buildSchema, execute, parse } from 'graphql';
import { checkVariables, describeUnknownKey } from '../../variableCheck.js';

/**
 * A widget's settings are the variables of its page query. `SlideInput` rejects
 * a key it does not define, `execute()` then returns no `data`, and one bad key
 * in one widget used to blank the whole page (Daylight 0.1.0 shipped `imageAlt`
 * on every slide). These tests pin what `checkVariables` does about that, and
 * that it follows whatever schema it is handed, because the schema is the only
 * source of truth.
 */

const sdl = (slideFields = '') => `
  input CtaInput { label: String! href: String }
  input SlideInput {
    id: String!
    image: String
    width: Int
    hidden: Boolean
    cta: CtaInput
    ${slideFields}
  }
  scalar JSON
  type Query { count(slides: [SlideInput]): Int }
`;

const schema = buildSchema(sdl());
const defs = [{ alias: 'variable_x1', origin: 'slides', type: '[SlideInput]' }];
const slide = (extra: Record<string, unknown> = {}) => ({
  id: 's1',
  image: '/a.jpg',
  ...extra
});

describe('checkVariables', () => {
  describe('a key the input type does not define', () => {
    it('is reported with where it is and what the type accepts', () => {
      const check = checkVariables(schema, defs, {
        variable_x1: [slide(), slide({ id: 's2', imageAlt: 'A dress' })]
      });
      expect(check.problems).toEqual([]);
      expect(check.unknownKeys).toEqual([
        {
          variable: 'slides',
          path: 'slides[1].imageAlt',
          typeName: 'SlideInput',
          accepted: ['cta', 'hidden', 'id', 'image', 'width']
        }
      ]);
      expect(describeUnknownKey(check.unknownKeys[0])).toBe(
        'slides[1].imageAlt is not a field of SlideInput (it accepts: cta, hidden, id, image, width)'
      );
    });

    it('is removed from the values, and nothing else is', () => {
      const check = checkVariables(schema, defs, {
        variable_x1: [slide({ imageAlt: 'x', width: 10, hidden: false })]
      });
      expect(check.values.variable_x1).toEqual([
        { id: 's1', image: '/a.jpg', width: 10, hidden: false }
      ]);
    });

    it('is found inside a nested input object', () => {
      const check = checkVariables(schema, defs, {
        variable_x1: [slide({ cta: { label: 'Shop', href: '/shop', target: '_blank' } })]
      });
      expect(check.unknownKeys.map((k) => [k.path, k.typeName])).toEqual([
        ['slides[0].cta.target', 'CtaInput']
      ]);
      expect(check.values.variable_x1).toEqual([
        slide({ cta: { label: 'Shop', href: '/shop' } })
      ]);
    });

    it('is found when a single item is given where a list is declared', () => {
      const check = checkVariables(schema, defs, {
        variable_x1: slide({ imageAlt: 'x' })
      });
      expect(check.unknownKeys.map((k) => k.path)).toEqual(['slides.imageAlt']);
      expect(check.problems).toEqual([]);
    });

    it('does not change the object it was given', () => {
      const original = [slide({ imageAlt: 'x' })];
      checkVariables(schema, defs, { variable_x1: original });
      expect(original[0]).toHaveProperty('imageAlt', 'x');
    });
  });

  describe('follows the schema it is given', () => {
    const value = { variable_x1: [slide({ imageAlt: 'A dress' })] };

    it('reports a field the schema does not have yet', () => {
      expect(checkVariables(buildSchema(sdl()), defs, value).unknownKeys).toHaveLength(1);
    });

    it('accepts the same value the day the field is added to the type', () => {
      const later = buildSchema(sdl('imageAlt: String'));
      const check = checkVariables(later, defs, value);
      expect(check.unknownKeys).toEqual([]);
      expect(check.problems).toEqual([]);
      expect(check.values.variable_x1).toEqual([slide({ imageAlt: 'A dress' })]);
    });

    it('reports a field the day it is removed from the type', () => {
      const earlier = buildSchema(sdl().replace('hidden: Boolean', ''));
      const check = checkVariables(earlier, defs, {
        variable_x1: [slide({ hidden: true })]
      });
      expect(check.unknownKeys.map((k) => k.path)).toEqual(['slides[0].hidden']);
    });
  });

  describe('what GraphQL still rejects once unknown keys are gone', () => {
    const problemsFor = (v: unknown, d = defs) =>
      checkVariables(schema, d, { variable_x1: v }).problems.map((p) => p.message);

    it('names the path and the reason for a wrong scalar', () => {
      expect(problemsFor([slide({ width: 'abc' })])).toEqual([
        'slides[0].width: Int cannot represent non-integer value: "abc"'
      ]);
    });

    it('is not fooled by a ; or an at "..." inside the rejected text', () => {
      // graphql-js prints the rejected value before the reason, so user text
      // that looks like the separator ends up in the middle of the message.
      const text = 'a; b at "c[0]"; d';
      expect(problemsFor([slide({ width: text })])).toEqual([
        `slides[0].width: Int cannot represent non-integer value: ${JSON.stringify(text)}`
      ]);
    });

    it('keeps a message short when the rejected value is huge', () => {
      const [message] = problemsFor([slide({ width: 'x'.repeat(5000) })]);
      expect(message.startsWith('slides[0].width: Int cannot represent')).toBe(true);
      expect(message.length).toBeLessThan(400);
      expect(message.endsWith('…')).toBe(true);
    });

    it('reports a required field that is missing', () => {
      expect(problemsFor([{ image: '/a.jpg' }])).toEqual([
        'slides[0]: Field "id" of required type "String!" was not provided.'
      ]);
    });

    it('reports a null for a non-null variable', () => {
      const required = [{ alias: 'variable_x1', origin: 'slides', type: '[SlideInput]!' }];
      expect(problemsFor(null, required)).toEqual([
        'slides must not be null ([SlideInput]!)'
      ]);
    });

    it('reports a required variable that was not provided at all', () => {
      const required = [{ alias: 'variable_x1', origin: 'slides', type: '[SlideInput]!' }];
      expect(checkVariables(schema, required, {}).problems.map((p) => p.message)).toEqual([
        'slides is required ([SlideInput]!) and was not provided'
      ]);
    });

    it('reports a type the schema does not have', () => {
      const missing = [{ alias: 'variable_x1', origin: 'items', type: '[Nope]' }];
      expect(problemsFor([], missing)).toEqual([
        'items is declared as [Nope], which is not an input type in the schema'
      ]);
    });

    it('reports a type string that is not GraphQL at all', () => {
      const bad = [{ alias: 'variable_x1', origin: 'items', type: '[[' }];
      expect(problemsFor([], bad)).toEqual([
        'items is declared as "[[", which is not a GraphQL type'
      ]);
    });

    it('still removes unknown keys when something else is wrong', () => {
      const check = checkVariables(schema, defs, {
        variable_x1: [slide({ imageAlt: 'x', width: 'abc' })]
      });
      expect(check.unknownKeys).toHaveLength(1);
      expect(check.problems).toHaveLength(1);
    });
  });

  describe('leaves alone what has no keys to strip', () => {
    it('passes any value through a JSON scalar', () => {
      const json = [{ alias: 'variable_j', origin: 'menu', type: 'JSON' }];
      const value = { items: [{ anything: { goes: [1, 2] } }] };
      const check = checkVariables(schema, json, { variable_j: value });
      expect(check.unknownKeys).toEqual([]);
      expect(check.problems).toEqual([]);
      expect(check.values.variable_j).toEqual(value);
    });

    it('treats a variable with no value as GraphQL does', () => {
      const check = checkVariables(schema, defs, { variable_x1: undefined });
      expect(check.problems).toEqual([]);
      expect(check.unknownKeys).toEqual([]);
    });

    it('does nothing for a widget that declares no variables', () => {
      const check = checkVariables(schema, [], {});
      expect(check).toEqual({ values: {}, unknownKeys: [], problems: [] });
    });
  });

  describe('agrees with execute()', () => {
    const document = parse(
      'query Query($variable_x1: [SlideInput]) { count(slides: $variable_x1) }'
    );
    const rootValue = { count: ({ slides }: { slides?: unknown[] }) => slides?.length ?? 0 };
    const value = [slide({ imageAlt: 'A dress' }), slide({ id: 's2' })];

    it('returns no data for the raw value: the crash this guards against', async () => {
      const result = await execute({
        schema,
        document,
        rootValue,
        variableValues: { variable_x1: value }
      });
      expect(result.data).toBeUndefined();
      expect(result.errors?.[0].message).toContain('imageAlt');
    });

    it('returns data for the cleaned value', async () => {
      const check = checkVariables(schema, defs, { variable_x1: value });
      const result = await execute({
        schema,
        document,
        rootValue,
        variableValues: check.values
      });
      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({ count: 2 });
    });
  });
});

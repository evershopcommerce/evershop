import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { buildSchema } from 'graphql';
import {
  checkWidgetSettings,
  findSettingsProblems,
  getWidgetVariableSpec,
  resolveSettingRef,
  widgetVariableValues
} from '../../widgetVariables.js';

/**
 * Settings -> variables is the seam between what a merchant saves and what the
 * page query receives. The fixtures here are compiled-component-shaped files read
 * by the real build parser, so the declarations are not hand-built.
 */

const ref = (args: string) =>
  `getWidgetSetting_${Buffer.from(args).toString('base64')}`;

const schema = buildSchema(`
  input SlideInput { id: String! image: String width: Int }
  type Query { fixtureWidget(slides: [SlideInput], autoplay: Boolean): Int }
`);

const component = (variablesBlock = '') => `
import React from 'react';
export default function Fixture() { return null; }

export const query = \`
  query Query($slides: [SlideInput], $autoplay: Boolean${variablesBlock ? ', $limit: Int' : ''}) {
    fixtureWidget(slides: $slides, autoplay: $autoplay${variablesBlock ? ', limit: $limit' : ''})
  }
\`;

export const variables = \`{
  slides: getWidgetSetting("slides"),
  autoplay: getWidgetSetting("autoplay", true)${variablesBlock}
}\`;
`;

let dir: string;
const write = (name: string, source: string) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, source);
  return file;
};

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'widget-variables-'));
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('resolveSettingRef', () => {
  const settings = { slides: [{ id: 'a' }], nested: { deep: { n: 3 } }, off: false };

  it('uses a literal as it is', () => {
    expect(resolveSettingRef(5, settings)).toEqual({ found: true, value: 5 });
    expect(resolveSettingRef(false, settings)).toEqual({ found: true, value: false });
    expect(resolveSettingRef({ a: 1 }, settings)).toEqual({ found: true, value: { a: 1 } });
  });

  it('reads the setting a getWidgetSetting reference points at', () => {
    expect(resolveSettingRef(ref('"slides"'), settings)).toEqual({
      found: true,
      value: [{ id: 'a' }]
    });
    expect(resolveSettingRef(ref('"nested.deep.n"'), settings).value).toBe(3);
    expect(resolveSettingRef(ref('"off"'), settings).value).toBe(false);
  });

  it('ignores the default after the comma, as the page-query middleware does for variables', () => {
    expect(resolveSettingRef(ref('"missing", 7'), settings)).toEqual({
      found: true,
      value: undefined
    });
  });

  it('hands over the whole settings object for an empty path', () => {
    expect(resolveSettingRef(ref(''), settings).value).toBe(settings);
  });

  it('drops a plain string, as the page-query middleware does', () => {
    expect(resolveSettingRef('just text', settings)).toEqual({ found: false });
  });
});

describe('getWidgetVariableSpec', () => {
  it('reads the variables a component declares', () => {
    const spec = getWidgetVariableSpec(write('plain.js', component()));
    expect(spec?.defs.map((d) => [d.origin, d.type])).toEqual([
      ['slides', '[SlideInput]'],
      ['autoplay', 'Boolean']
    ]);
    const slides = spec!.defs[0].alias;
    expect(resolveSettingRef(spec!.raw[slides], { slides: [1] }).value).toEqual([1]);
  });

  it('keeps the result for a file until the file changes', () => {
    const file = write('cached.js', component());
    const first = getWidgetVariableSpec(file);
    expect(getWidgetVariableSpec(file)).toBe(first);

    write('cached.js', component(',\n  limit: getWidgetSetting("limit")'));
    const later = new Date(Date.now() + 10_000);
    fs.utimesSync(file, later, later);
    expect(getWidgetVariableSpec(file)?.defs.map((d) => d.origin)).toEqual([
      'slides',
      'autoplay',
      'limit'
    ]);
  });

  it('declares nothing for a component with no query', () => {
    const spec = getWidgetVariableSpec(
      write('noquery.js', 'export default function A() { return null; }')
    );
    expect(spec).toEqual({ defs: [], raw: {} });
  });

  it('gives null for a file that is missing', () => {
    expect(getWidgetVariableSpec(path.join(dir, 'nope.js'))).toBeNull();
  });

  it('gives null for a query that does not parse, instead of throwing', () => {
    const spec = getWidgetVariableSpec(
      write('broken.js', 'export const query = `query { oops(`;')
    );
    expect(spec).toBeNull();
  });
});

describe('widgetVariableValues', () => {
  it('maps each variable to the setting it names, by alias', () => {
    const spec = getWidgetVariableSpec(write('values.js', component()))!;
    const values = widgetVariableValues(spec, { slides: [{ id: 'a' }], autoplay: true });
    expect(Object.values(values)).toEqual([[{ id: 'a' }], true]);
    expect(Object.keys(values)).toEqual(spec.defs.map((d) => d.alias));
  });

  it('keeps a variable whose setting is missing, as undefined', () => {
    const spec = getWidgetVariableSpec(write('values2.js', component()))!;
    const values = widgetVariableValues(spec, {});
    expect(Object.keys(values)).toHaveLength(2);
    expect(Object.values(values)).toEqual([undefined, undefined]);
  });
});

describe('checkWidgetSettings and findSettingsProblems', () => {
  const spec = () => getWidgetVariableSpec(write('check.js', component()))!;
  const slide = (extra = {}) => ({ id: 's1', image: '/a.jpg', ...extra });

  it('accept settings that match the schema', () => {
    const check = checkWidgetSettings(schema, spec(), { slides: [slide()], autoplay: true });
    expect(check.unknownKeys).toEqual([]);
    expect(check.problems).toEqual([]);
    expect(findSettingsProblems(schema, spec(), { slides: [slide()] })).toEqual([]);
  });

  it('refuse the settings Daylight 0.1.0 shipped: an unknown key on a slide', () => {
    expect(
      findSettingsProblems(schema, spec(), { slides: [slide({ imageAlt: 'A dress' })] })
    ).toEqual([
      'slides[0].imageAlt is not a field of SlideInput (it accepts: id, image, width)'
    ]);
  });

  it('refuse a value of the wrong type', () => {
    expect(findSettingsProblems(schema, spec(), { slides: [slide({ width: 'wide' })] })).toEqual([
      'slides[0].width: Int cannot represent non-integer value: "wide"'
    ]);
  });

  it('do not blame an update for what the stored settings already got wrong', () => {
    const stored = { slides: [slide({ imageAlt: 'old' })] };
    // The merchant edits another field and the old key rides along.
    const edited = { slides: [slide({ imageAlt: 'old', image: '/b.jpg' })] };
    expect(findSettingsProblems(schema, spec(), edited, stored)).toEqual([]);
  });

  it('still refuse a key the update itself introduces', () => {
    const stored = { slides: [slide({ imageAlt: 'old' })] };
    const edited = { slides: [slide({ imageAlt: 'old', caption: 'new' })] };
    expect(findSettingsProblems(schema, spec(), edited, stored)).toEqual([
      'slides[0].caption is not a field of SlideInput (it accepts: id, image, width)'
    ]);
  });

  it('follow a schema that moved on', () => {
    const later = buildSchema(`
      input SlideInput { id: String! image: String width: Int imageAlt: String }
      type Query { fixtureWidget(slides: [SlideInput], autoplay: Boolean): Int }
    `);
    const settings = { slides: [slide({ imageAlt: 'A dress' })] };
    expect(findSettingsProblems(schema, spec(), settings)).toHaveLength(1);
    expect(findSettingsProblems(later, spec(), settings)).toEqual([]);
  });
});

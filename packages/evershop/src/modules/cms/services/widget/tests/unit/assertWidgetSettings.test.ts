import { describe, expect, it, jest } from '@jest/globals';
import { buildSchema } from 'graphql';
import {
  assertWidgetSettingsMatchSchema,
  type AssertWidgetSettingsDeps
} from '../../assertWidgetSettings.js';

/**
 * The save path's half of the guard. Daylight 0.1.0 put `imageAlt` on every hero
 * slide, the widget's JSON Schema let it through (it is loose on purpose), and
 * the first visitor got a 500. A save must refuse it, using the GraphQL type as
 * it stands NOW rather than a copy of it, and must not lock a merchant out over
 * something an older schema let in.
 */

const sdl = (extra = '') => `
  input SlideInput { id: String! image: String ${extra} }
  type Query { fixtureWidget(slides: [SlideInput]): Int }
`;
const ref = (args: string) =>
  `getWidgetSetting_${Buffer.from(args).toString('base64')}`;
const slidesSpec = {
  defs: [{ alias: 'variable_a', origin: 'slides', type: '[SlideInput]' }],
  raw: { variable_a: ref('"slides"') }
};

function deps(over: Partial<AssertWidgetSettingsDeps> = {}) {
  const getSchema = jest.fn(async () => buildSchema(sdl()));
  const all: AssertWidgetSettingsDeps = {
    getSchema,
    getComponentPath: () => '/dist/Fixture.js',
    getSpec: () => slidesSpec,
    ...over
  };
  return { all, getSchema };
}
const slide = (extra = {}) => ({ id: 's1', image: '/a.jpg', ...extra });

describe('assertWidgetSettingsMatchSchema', () => {
  it('accepts settings the schema accepts', async () => {
    const { all } = deps();
    await expect(
      assertWidgetSettingsMatchSchema('simple_slider', { slides: [slide()], dots: true }, null, all)
    ).resolves.toBeUndefined();
  });

  it('refuses an unknown key, naming where it is and what the type accepts', async () => {
    const { all } = deps();
    await expect(
      assertWidgetSettingsMatchSchema(
        'simple_slider',
        { slides: [slide({ imageAlt: 'A dress' })] },
        null,
        all
      )
    ).rejects.toThrow(
      'Widget settings do not match the current GraphQL schema: ' +
        'slides[0].imageAlt is not a field of SlideInput (it accepts: id, image)'
    );
  });

  it('refuses a value of the wrong type', async () => {
    const { all } = deps({
      getSchema: async () =>
        buildSchema(
          'input SlideInput { id: String! width: Int } type Query { a: Int }'
        )
    });
    await expect(
      assertWidgetSettingsMatchSchema('simple_slider', { slides: [{ id: 'a', width: 'x' }] }, null, all)
    ).rejects.toThrow('slides[0].width: Int cannot represent non-integer value: "x"');
  });

  it('reads the schema as it is each time, so a field added later is accepted', async () => {
    const settings = { slides: [slide({ imageAlt: 'A dress' })] };
    const before = deps();
    await expect(
      assertWidgetSettingsMatchSchema('simple_slider', settings, null, before.all)
    ).rejects.toThrow('imageAlt');

    const after = deps({ getSchema: async () => buildSchema(sdl('imageAlt: String')) });
    await expect(
      assertWidgetSettingsMatchSchema('simple_slider', settings, null, after.all)
    ).resolves.toBeUndefined();
  });

  describe('on update', () => {
    const stored = { slides: [slide({ imageAlt: 'old' })] };

    it('lets an older key ride along when the merchant edits something else', async () => {
      const { all } = deps();
      const edited = { slides: [slide({ imageAlt: 'old', image: '/b.jpg' })] };
      await expect(
        assertWidgetSettingsMatchSchema('simple_slider', edited, stored, all)
      ).resolves.toBeUndefined();
    });

    it('still refuses a key the update introduces', async () => {
      const { all } = deps();
      const edited = { slides: [slide({ imageAlt: 'old', caption: 'new' })] };
      await expect(
        assertWidgetSettingsMatchSchema('simple_slider', edited, stored, all)
      ).rejects.toThrow('slides[0].caption is not a field of SlideInput');
    });
  });

  describe('never blocks on tooling', () => {
    it('skips a widget type that is not registered', async () => {
      const { all, getSchema } = deps({ getComponentPath: () => undefined });
      await assertWidgetSettingsMatchSchema('ghost', { slides: [slide({ nope: 1 })] }, null, all);
      expect(getSchema).not.toHaveBeenCalled();
    });

    it('skips a component file that could not be read', async () => {
      const { all, getSchema } = deps({ getSpec: () => null });
      await assertWidgetSettingsMatchSchema('simple_slider', { slides: [slide({ nope: 1 })] }, null, all);
      expect(getSchema).not.toHaveBeenCalled();
    });

    it('does not even build the schema for a widget that declares no variables', async () => {
      const { all, getSchema } = deps({ getSpec: () => ({ defs: [], raw: {} }) });
      await assertWidgetSettingsMatchSchema('text_block', { text: 'hi' }, null, all);
      expect(getSchema).not.toHaveBeenCalled();
    });
  });
});

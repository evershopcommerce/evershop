import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { buildSchema } from 'graphql';

/**
 * Guard for the page-query middleware. A widget's settings are variables of the
 * page query, and ONE variable GraphQL rejects fails the whole operation: no
 * data, a blank page, `HeadTags` throwing on `pageInfo.title`. Daylight 0.1.0
 * put `imageAlt` on its hero slides and a fresh install's homepage was a 500.
 *
 * The middleware is real; what it talks to is mocked, and the build output it
 * reads is a real file.
 */

const widgetKey = 'w_slider';
const settingKey = 'w_slider_setting';
const ref = (args: string) =>
  `getWidgetSetting_${Buffer.from(args).toString('base64')}`;

const schema = buildSchema(`
  input SlideInput { id: String! image: String width: Int }
  type Query { a: Int }
`);

const buildOutput = JSON.stringify({
  queries: {
    page: 'ePage: pageInfo { title }',
    [widgetKey]: 'eSlider: sliderWidget(slides: $variable_aaa) { slides { id } }',
    [settingKey]: 'eSetting: sliderWidget(slides: $variable_bbb) { slides { id } }'
  },
  fragments: '',
  propsMap: {
    page: [{ origin: 'pageInfo', alias: 'ePage' }],
    [widgetKey]: [{ origin: 'sliderWidget', alias: 'eSlider' }],
    [settingKey]: [{ origin: 'sliderWidget', alias: 'eSetting' }]
  },
  variables: {
    page: { values: {}, defs: [] },
    [widgetKey]: {
      values: { variable_aaa: ref('"slides"') },
      defs: [{ origin: 'slides', type: '[SlideInput]', alias: 'variable_aaa' }]
    },
    [settingKey]: {
      values: { variable_bbb: ref('"slides"') },
      defs: [{ origin: 'slides', type: '[SlideInput]', alias: 'variable_bbb' }]
    }
  }
});

let buildDir: string;
let instances: Array<Record<string, unknown>> = [];
const warning = jest.fn();
const getRequestSchema = jest.fn(async () => schema);

jest.unstable_mockModule('../../../../bin/lib/devEnvHelper.js', () => ({
  getDevMiddleware: jest.fn()
}));
jest.unstable_mockModule('../../../../lib/helpers.js', () => ({
  CONSTANTS: {
    get BUILDPATH() {
      return buildDir;
    }
  }
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  error: jest.fn(),
  warning,
  debug: jest.fn(),
  info: jest.fn(),
  success: jest.fn()
}));
jest.unstable_mockModule('../../../../lib/router/Router.js', () => ({
  getRoutes: () => []
}));
jest.unstable_mockModule('../../../../lib/util/isDevelopmentMode.js', () => ({
  default: () => false,
  isDevelopmentMode: () => false
}));
jest.unstable_mockModule('../../../../lib/webpack/getRouteBuildPath.js', () => ({
  getRouteBuildPath: (route: { id: string; isAdmin: boolean }) =>
    `${route.isAdmin ? 'admin' : 'frontStore'}/${route.id}`
}));
jest.unstable_mockModule('../../../../lib/widget/widgetManager.js', () => ({
  getEnabledWidgets: () => [
    {
      type: 'simple_slider',
      component: '/x/Slideshow.js',
      componentKey: widgetKey,
      settingComponent: '/x/SlideshowSetting.js',
      settingComponentKey: settingKey
    }
  ]
}));
jest.unstable_mockModule(
  '../../../cms/services/widget/loadWidgetInstances.js',
  () => ({ loadWidgetInstances: async () => instances })
);
jest.unstable_mockModule('../../services/contextHelper.js', () => ({
  getContextValue: () => null
}));
jest.unstable_mockModule('../../services/getRequestSchema.js', () => ({
  getRequestSchema
}));

const { default: buildQuery } = await import(
  '../../pages/global/[bodyParser,notFound]buildQuery[graphql].js'
);

const slide = (extra = {}) => ({ id: 's1', image: '/a.jpg', ...extra });
const widget = (uuid: string, settings: Record<string, unknown>) => ({
  uuid,
  type: 'simple_slider',
  settings
});
const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';

async function run(route = { id: 'homepage', isAdmin: false }) {
  const request: any = { currentRoute: route, body: {}, locals: {} };
  const response: any = { locals: {} };
  const next = jest.fn();
  await (buildQuery as any)(request, response, next);
  return { request, response, next, body: request.body };
}
const sliderCount = (query: string) => (query.match(/sliderWidget\(/g) ?? []).length;

beforeAll(() => {
  buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'build-query-guard-'));
  for (const sub of ['frontStore/homepage', 'admin/widgetEdit']) {
    const dir = path.join(buildDir, sub, 'server');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'query.graphql'), buildOutput);
  }
});
afterAll(() => {
  fs.rmSync(buildDir, { recursive: true, force: true });
});
beforeEach(() => {
  instances = [];
  warning.mockClear();
  getRequestSchema.mockClear();
});

describe('page-query middleware: a widget whose settings the schema rejects', () => {
  it('passes a valid widget through untouched', async () => {
    instances = [widget(U1, { slides: [slide()] })];
    const { body, next } = await run();
    expect(next).toHaveBeenCalledWith();
    expect(sliderCount(body.graphqlQuery)).toBe(1);
    expect(Object.values(body.graphqlVariables)).toEqual([[slide()]]);
    expect(warning).not.toHaveBeenCalled();
  });

  it('drops a key the input type does not define and still renders the widget', async () => {
    instances = [widget(U1, { slides: [slide({ imageAlt: 'A dress' })] })];
    const { body, response } = await run();
    expect(sliderCount(body.graphqlQuery)).toBe(1);
    expect(Object.values(body.graphqlVariables)).toEqual([[slide()]]);
    expect(response.locals.skippedWidgets).toBeUndefined();
    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning.mock.calls[0][0]).toContain('slides[0].imageAlt');
    expect(warning.mock.calls[0][0]).toContain(U1);
  });

  it('does not change the settings object it was handed', async () => {
    const settings = { slides: [slide({ imageAlt: 'x' })] };
    instances = [widget(U1, settings)];
    await run();
    expect(settings.slides[0]).toHaveProperty('imageAlt', 'x');
  });

  it('leaves out a widget GraphQL would still reject, and says so to the response', async () => {
    instances = [widget(U1, { slides: [slide({ width: 'wide' })] })];
    const { body, response, next } = await run();
    expect(next).toHaveBeenCalledWith();
    expect(sliderCount(body.graphqlQuery)).toBe(0);
    expect(body.graphqlQuery).toContain('pageInfo');
    expect(body.graphqlVariables).toEqual({});
    expect(response.locals.skippedWidgets).toEqual([U1]);
    expect(warning.mock.calls[0][0]).toContain(
      'slides[0].width: Int cannot represent non-integer value: "wide"'
    );
  });

  it('keeps the rest of the page when one of two widgets is bad', async () => {
    instances = [
      widget(U1, { slides: [slide({ width: 'wide' })] }),
      widget(U2, { slides: [slide({ id: 's2' })] })
    ];
    const { body, response } = await run();
    expect(sliderCount(body.graphqlQuery)).toBe(1);
    expect(Object.values(body.graphqlVariables)).toEqual([[slide({ id: 's2' })]]);
    expect(response.locals.skippedWidgets).toEqual([U1]);
  });

  it('leaves out a widget missing a required field, instead of failing the page', async () => {
    instances = [widget(U1, { slides: [{ image: '/a.jpg' }] })];
    const { response, body } = await run();
    expect(response.locals.skippedWidgets).toEqual([U1]);
    expect(body.graphqlQuery).toContain('pageInfo');
  });

  it('says it once, however many visitors', async () => {
    instances = [widget(U2, { slides: [slide({ imageAlt: 'x' })] })];
    await run();
    await run();
    await run();
    expect(warning).toHaveBeenCalledTimes(1);
  });

  it('does not build a schema for a page with no widgets', async () => {
    instances = [];
    const { body } = await run();
    expect(getRequestSchema).not.toHaveBeenCalled();
    expect(body.graphqlQuery).toContain('pageInfo');
  });
});

describe('page-query middleware: the admin widget editor', () => {
  it('is not checked, so a broken widget can still be opened and fixed', async () => {
    instances = [widget(U1, { slides: [slide({ imageAlt: 'x', width: 'wide' })] })];
    const { body, response } = await run({ id: 'widgetEdit', isAdmin: true });
    expect(getRequestSchema).not.toHaveBeenCalled();
    expect(response.locals.skippedWidgets).toBeUndefined();
    expect(Object.values(body.graphqlVariables)).toEqual([
      [slide({ imageAlt: 'x', width: 'wide' })]
    ]);
  });
});

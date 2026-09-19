import { jest, describe, it, expect, beforeEach } from '@jest/globals';

let rewriteRows: any[] = [];
const selChain: any = {
  from: () => selChain,
  where: () => selChain,
  execute: jest.fn(async () => rewriteRows)
};
const select = jest.fn(() => selChain);

let upsertKeys: any = null;
let upsertGiven: any = null;
const insChain: any = {
  given: jest.fn((d: any) => {
    upsertGiven = d;
    return insChain;
  }),
  execute: jest.fn(async () => undefined)
};
const insertOnUpdate = jest.fn((_table: string, keys: string[]) => {
  upsertKeys = keys;
  return insChain;
});
const del = jest.fn(() => ({
  where: () => ({ and: () => ({ execute: async () => undefined }) })
}));

let routes: any[] = [];
const getRoutes = jest.fn(() => routes);
let locales: string[] = [];
const getEnabledLanguages = jest.fn(async () => locales);

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({
  select,
  insertOnUpdate,
  del
}));
jest.unstable_mockModule('../../../../../../lib/router/Router.js', () => ({
  getRoutes
}));
jest.unstable_mockModule(
  '../../../../../setting/services/setting.js',
  () => ({ getEnabledLanguages })
);

const { syncPageUrlRewrite, assertUrlKeyAvailable } = await import(
  '../../syncPageUrlRewrite.js'
);

const conn = {} as any;

describe('syncPageUrlRewrite', () => {
  beforeEach(() => {
    upsertKeys = null;
    upsertGiven = null;
    jest.clearAllMocks();
  });

  it('upserts a cms_page url_rewrite keyed on entity_uuid, mapping /<key> -> /page/<key>', async () => {
    await syncPageUrlRewrite(conn, { uuid: 'p1', url_key: 'about-us' });
    expect(upsertKeys).toEqual(['entity_uuid']);
    expect(upsertGiven).toEqual({
      entity_type: 'cms_page',
      entity_uuid: 'p1',
      request_path: '/about-us',
      target_path: '/page/about-us'
    });
  });
});

describe('assertUrlKeyAvailable', () => {
  beforeEach(() => {
    routes = [];
    locales = [];
    rewriteRows = [];
    jest.clearAllMocks();
  });

  it('rejects a slug that shadows a single-segment static frontStore route', async () => {
    routes = [{ path: '/cart', isAdmin: false, isApi: false }];
    await expect(assertUrlKeyAvailable(conn, 'cart', null)).rejects.toThrow(
      /reserved by a system route/
    );
  });

  it('ignores admin/api and multi-segment routes when checking reserved slugs', async () => {
    routes = [
      { path: '/cart', isAdmin: true, isApi: false }, // admin — ignored
      { path: '/products/:id', isAdmin: false, isApi: false } // has param — ignored
    ];
    await expect(
      assertUrlKeyAvailable(conn, 'cart', null)
    ).resolves.toBeUndefined();
  });

  it('rejects a slug equal to an enabled locale code', async () => {
    locales = ['en', 'fr'];
    await expect(assertUrlKeyAvailable(conn, 'fr', null)).rejects.toThrow(
      /language code/
    );
  });

  it('rejects a slug already owned by another CMS page (same type)', async () => {
    rewriteRows = [
      { entity_uuid: 'other', entity_type: 'cms_page', request_path: '/shoes' }
    ];
    await expect(assertUrlKeyAvailable(conn, 'shoes', 'self')).rejects.toThrow(
      /already in use/
    );
  });

  it('allows a slug owned by a DIFFERENT entity type (cross-type — landing wins at request time)', async () => {
    rewriteRows = [
      {
        entity_uuid: 'other',
        entity_type: 'landing_page',
        request_path: '/shoes'
      }
    ];
    await expect(
      assertUrlKeyAvailable(conn, 'shoes', 'self')
    ).resolves.toBeUndefined();
  });

  it('does not treat the entity itself as a collision', async () => {
    rewriteRows = [
      { entity_uuid: 'self', entity_type: 'cms_page', request_path: '/mine' }
    ];
    await expect(
      assertUrlKeyAvailable(conn, 'mine', 'self')
    ).resolves.toBeUndefined();
  });

  it('allows a free, non-reserved, non-locale slug', async () => {
    routes = [{ path: '/cart', isAdmin: false, isApi: false }];
    locales = ['en'];
    rewriteRows = [];
    await expect(
      assertUrlKeyAvailable(conn, 'about-us', 'self')
    ).resolves.toBeUndefined();
  });
});

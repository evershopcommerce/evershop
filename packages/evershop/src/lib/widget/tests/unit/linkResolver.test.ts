import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * Regression guard for the built-in cms:page link loader.
 *
 * The loader once did `select('uuid', 'url_key').from('cms_page')`, but
 * `url_key` lives on `cms_page_description`, not `cms_page`. That query threw
 * `column "url_key" does not exist`; the per-request batcher swallows loader
 * errors (returns null so the page still renders), so every menu/CTA link to a
 * CMS page resolved to `null` and rendered as an unclickable `<a>` with no href.
 * The loader must read the resolved friendly path from `url_rewrite`, like the
 * sibling product/category loaders.
 */

let capturedFrom: string | null = null;
const capturedConds: Array<[string, string, unknown]> = [];
let rows: any[] = [];

const chain: any = {
  from: (t: string) => {
    capturedFrom = t;
    return chain;
  },
  where: (c: string, op: string, v: unknown) => {
    capturedConds.push([c, op, v]);
    return chain;
  },
  and: (c: string, op: string, v: unknown) => {
    capturedConds.push([c, op, v]);
    return chain;
  },
  execute: jest.fn(async () => rows)
};
const select = jest.fn((..._cols: string[]) => chain);

jest.unstable_mockModule('../../../postgres/query.js', () => ({ select }));
jest.unstable_mockModule('../../../locale/localeContext.js', () => ({
  // Passthrough — models the default (unprefixed) storefront locale.
  localizeUrl: (u: string) => u
}));
jest.unstable_mockModule('../../../router/buildUrl.js', () => ({
  buildUrl: (routeId: string, params: Record<string, string>) =>
    `/${routeId}/${params.uuid}`
}));
jest.unstable_mockModule('../../../util/registry.js', () => ({
  addProcessor: jest.fn(),
  // No bootstrap in a unit test → no registered factories → use the default
  // (the module-private BUILTIN map the loader passes as the fallback).
  getValueSync: (_key: string, def: unknown) => def
}));

// Real URN module: self-registers cms:page / catalog:product schemas at import.
const { createLinkLoaders, resolveLink } = await import(
  '../../linkResolver.js'
);

const PAGE_UUID = 'b6c78184-efde-4fd1-a8c8-8da2d04545bd';
const PAGE_UUID_2 = '74229224-9df0-49ed-992d-b62766bf34cc';

describe('linkResolver — cms:page loader', () => {
  beforeEach(() => {
    capturedFrom = null;
    capturedConds.length = 0;
    rows = [];
    jest.clearAllMocks();
  });

  it('resolves a cms:page URN to its url_rewrite request_path (not cms_page.url_key)', async () => {
    rows = [{ entity_uuid: PAGE_UUID, request_path: '/about-us' }];
    const loaders = createLinkLoaders({} as any);

    const url = await resolveLink(`urn:evershop:cms:page:${PAGE_UUID}`, loaders);

    expect(url).toBe('/about-us');
    // The fix: read from url_rewrite filtered by entity_type, never `cms_page`.
    expect(capturedFrom).toBe('url_rewrite');
    expect(capturedFrom).not.toBe('cms_page');
    expect(capturedConds).toContainEqual(['entity_type', '=', 'cms_page']);
  });

  it('returns null when the page has no url_rewrite row (suppresses the anchor)', async () => {
    rows = [];
    const loaders = createLinkLoaders({} as any);

    const url = await resolveLink(`urn:evershop:cms:page:${PAGE_UUID}`, loaders);

    expect(url).toBeNull();
  });

  it('batches cms:page URNs resolved in the same tick into a single query', async () => {
    rows = [
      { entity_uuid: PAGE_UUID, request_path: '/about-us' },
      { entity_uuid: PAGE_UUID_2, request_path: '/term-of-use' }
    ];
    const loaders = createLinkLoaders({} as any);

    const [a, b] = await Promise.all([
      resolveLink(`urn:evershop:cms:page:${PAGE_UUID}`, loaders),
      resolveLink(`urn:evershop:cms:page:${PAGE_UUID_2}`, loaders)
    ]);

    expect(a).toBe('/about-us');
    expect(b).toBe('/term-of-use');
    expect(chain.execute).toHaveBeenCalledTimes(1);
  });

  it('passes a plain URL / relative path through unchanged (non-URN)', async () => {
    const loaders = createLinkLoaders({} as any);

    expect(await resolveLink('/c/sale', loaders)).toBe('/c/sale');
    expect(await resolveLink('https://example.com', loaders)).toBe(
      'https://example.com'
    );
    // A non-URN value never hits a loader query.
    expect(select).not.toHaveBeenCalled();
  });

  it('returns null for an empty/undefined value', async () => {
    const loaders = createLinkLoaders({} as any);
    expect(await resolveLink('', loaders)).toBeNull();
    expect(await resolveLink(undefined, loaders)).toBeNull();
  });
});

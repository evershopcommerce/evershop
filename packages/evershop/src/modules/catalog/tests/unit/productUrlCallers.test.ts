import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * The three places that turn a product into its storefront URL use
 * getProductUrl / getProductUrls, so they cannot drift apart again: the
 * GraphQL `Product.url`, the cart item's `productUrl` field and the widget
 * link resolver's `catalog:product` loader. The helper is replaced with a
 * stand-in that returns real-looking paths. Each caller keeps its own
 * localization, checked in a second-language (fr) request: `Product.url`
 * passes the path through `localizeUrl`, the other two return it as it is.
 */
const SHIRT = '4b3a1c2d-0e9f-4a8b-9c7d-6e5f4a3b2c1d';
const NEW = '1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b'; // no url_rewrite row yet
const paths: Record<string, string> = { [SHIRT]: '/men/basic-tee' };
const pathOf = (uuid: string) => paths[uuid] ?? `/product/${uuid}`;

const calls: Array<{ fn: string; args: unknown[] }> = [];
jest.unstable_mockModule('../../services/product/productUrl.js', () => ({
  getProductUrl: async (...args: unknown[]) => {
    calls.push({ fn: 'getProductUrl', args });
    const product = args[0] as string | { uuid: string };
    return pathOf(typeof product === 'string' ? product : product.uuid);
  },
  getProductUrls: async (...args: unknown[]) => {
    calls.push({ fn: 'getProductUrls', args });
    return (args[0] as string[]).map(pathOf);
  }
}));

const { runWithLocale } = await import(
  '../../../../lib/locale/localeContext.js'
);
const { default: productResolvers } = await import(
  '../../graphql/types/Product/Product.resolvers.js'
);
const { registerCartItemProductUrlField } = await import(
  '../../services/registerCartItemProductUrlField.js'
);
const { createLinkLoaders, resolveLink } = await import(
  '../../../../lib/widget/linkResolver.js'
);

const FR = {
  locale: 'fr',
  defaultLocale: 'en',
  available: ['en', 'fr'],
  dict: {},
  isAdmin: false
};
const inFrench = <T>(fn: () => Promise<T>) => runWithLocale(FR, fn);

beforeEach(() => {
  calls.length = 0;
});

describe('the product URL callers use getProductUrl', () => {
  it('GraphQL Product.url, with the request pool, localized', async () => {
    const pool = { tag: 'request pool' };
    const url = await inFrench(() =>
      (productResolvers as any).Product.url({ uuid: SHIRT }, {}, { pool })
    );
    expect(url).toBe('/fr/men/basic-tee');
    expect(calls).toEqual([{ fn: 'getProductUrl', args: [SHIRT, {}, pool] }]);
  });

  it("the cart item's productUrl, not localized, and null without a product id", async () => {
    const [field] = registerCartItemProductUrlField([]);
    const resolver = field.resolvers[0];
    const item = (productId: number | null) => ({
      getProduct: async () => ({ uuid: SHIRT }),
      getData: (key: string) => (key === 'product_id' ? productId : null)
    });
    expect(await inFrench(() => resolver.call(item(5)))).toBe(
      '/men/basic-tee'
    );
    expect(await resolver.call(item(null))).toBeNull();
    // A path (no `absolute`), on the default pool
    expect(calls).toEqual([{ fn: 'getProductUrl', args: [SHIRT] }]);
  });

  it("the widget link resolver's catalog:product loader: one batch, not localized, route URL passed through", async () => {
    const pool = { tag: 'pool' } as never;
    const [shirt, fresh] = await inFrench(() => {
      const loaders = createLinkLoaders(pool);
      return Promise.all([
        resolveLink(`urn:evershop:catalog:product:${SHIRT}`, loaders),
        resolveLink(`urn:evershop:catalog:product:${NEW}`, loaders)
      ]);
    });
    expect(shirt).toBe('/men/basic-tee');
    expect(fresh).toBe(`/product/${NEW}`);
    // The two links resolved in the same tick share one call
    expect(calls).toEqual([
      { fn: 'getProductUrls', args: [[SHIRT, NEW], {}, pool] }
    ]);
  });
});

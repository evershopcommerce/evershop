import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

/**
 * The places that turned a stored file into an absolute URL by hand now use
 * getAssetUrl / getImageUrl, and their output is what it was: the social
 * sharing image of a product, a category, the store (social image, logo
 * fallback) and a blog post, the favicon fallback, the email logo and the
 * order confirmation email's item thumbnails. Each runs for real over a
 * stand-in pool and settings, with a local-storage path and with a cloud
 * storage URL, and is compared with the URL it built before; then with the
 * values the hand-built code got wrong (an uppercase scheme, a path without
 * a leading slash, a script).
 */
const BASE = 'https://shop.example.com';
process.env.EVERSHOP_HOME_URL = BASE;
const LOCAL = '/assets/catalog/9424/1250/tee.jpg';
const CLOUD =
  'https://myshop.blob.core.windows.net/media/catalog/tee black.jpg?v=2';
const enc = encodeURIComponent;

const rows: Record<string, Record<string, unknown>[]> = {};
const fakePool = {
  async query(sql: string | { text: string }) {
    const text = typeof sql === 'string' ? sql : sql.text;
    const table = /FROM\s+"?(\w+)"?/i.exec(text)?.[1] ?? '';
    return { rows: (rows[table] ?? []).map((row) => ({ ...row })) };
  },
  release() {}
};
const settings: Record<string, unknown> = {};

jest.unstable_mockModule('../../../postgres/connection.js', () => ({
  pool: fakePool,
  getConnection: async () => fakePool
}));
jest.unstable_mockModule(
  '../../../../modules/setting/services/setting.js',
  () => ({
    getSetting: async (name: string, fallback: unknown) =>
      settings[name] ?? fallback,
    getSettingSync: (name: string, fallback: unknown) =>
      settings[name] ?? fallback,
    refreshSetting: async () => undefined,
    getStoreName: async () => 'Shop',
    getStoreDescription: async () => null,
    getStoreLanguage: async () => 'en',
    getStoreLanguageSync: () => 'en',
    getEnabledLanguages: async () => ['en'],
    getAdditionalLanguages: async () => [],
    getAdminLanguage: async () => 'en',
    getStoreCurrency: () => 'USD',
    getStoreTimezone: () => 'UTC',
    getWeightUnit: () => 'kg',
    getDimensionUnit: () => 'cm',
    getStoreEmail: async () => null,
    getStorePhoneNumber: async () => null,
    getStoreCountry: async () => null,
    getStoreProvince: async () => null,
    getStoreCity: async () => null,
    getStoreAddress: async () => null,
    getStorePostalCode: async () => null
  })
);
// The favicon fallback checks for public/favicon.ico (git-ignored, so not in CI)
const realFs = await import('fs/promises');
const access = async (file: unknown) => {
  if (String(file).endsWith('favicon.ico')) {
    return;
  }
  throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
};
jest.unstable_mockModule('fs/promises', () => ({
  ...realFs,
  default: { ...realFs.default, access },
  access
}));
jest.unstable_mockModule('../../../../modules/oms/services/orderEmailLink.js', () => ({
  getOrderEmailLink: () => `${BASE}/order/x`
}));
jest.unstable_mockModule('../../../log/logger.js', () => ({
  debug: () => undefined,
  info: () => undefined,
  warning: () => undefined,
  error: () => undefined,
  success: () => undefined
}));

const { addProcessor } = await import('../../registry.js');
const { getPageMetaInfo } = await import(
  '../../../../modules/cms/services/pageMetaInfo.js'
);
const { default: productView } = await import(
  '../../../../modules/catalog/pages/frontStore/productView/index.js'
);
const { default: categoryView } = await import(
  '../../../../modules/catalog/pages/frontStore/categoryView/index.js'
);
const { default: blogPostView } = await import(
  '../../../../modules/blog/pages/frontStore/blogPostView/index.js'
);
const { default: pageInfoResolvers } = await import(
  '../../../../modules/cms/graphql/types/PageInfo/PageInfo.resolvers.js'
);
const { buildEmailBodyFromTemplate } = await import('../../../mail/emailHelper.js');
const { default: sendOrderConfirmationEmail } = await import(
  '../../../../modules/oms/subscribers/order_placed/sendOrderConfirmationEmail.js'
);

/** Run a page middleware and return the og:image it set */
async function ogImageOf(middleware: any): Promise<string | undefined> {
  const request: any = {
    params: { uuid: 'u-1' },
    query: {},
    app: { locals: {} },
    locals: {}
  };
  const response: any = { status: () => response };
  let failure: unknown;
  await middleware(request, response, (e?: unknown) => {
    failure = e;
  });
  if (failure) {
    throw failure;
  }
  return (getPageMetaInfo(request) as any).ogInfo?.image;
}

beforeEach(() => {
  for (const key of Object.keys(settings)) {
    delete settings[key];
  }
});

describe.each([
  ['local storage', LOCAL, 'https://shop.example.com/assets/catalog/9424/1250/tee.jpg'],
  ['cloud storage', CLOUD, CLOUD]
])('with %s', (_kind, stored, assetUrl) => {
  it('the product page social image', async () => {
    rows.product = [{ product_id: 1, uuid: 'u-1', name: 'Tee' }];
    rows.product_image = [{ origin_image: stored }];
    expect(await ogImageOf(productView)).toBe(
      `${BASE}/images?src=${enc(stored)}&w=1200&q=80&h=675&f=png`
    );
  });

  it('the category page social image', async () => {
    rows.category = [{ category_id: 2, uuid: 'u-1', name: 'Men', image: stored }];
    expect(await ogImageOf(categoryView)).toBe(
      `${BASE}/images?src=${enc(stored)}&w=1200&q=80&h=675&f=png`
    );
  });

  it('the blog post social image', async () => {
    rows.blog_post = [
      { blog_post_id: 3, uuid: 'u-1', name: 'Post', url_key: 'post', thumbnail: stored }
    ];
    expect(await ogImageOf(blogPostView)).toBe(assetUrl);
  });

  it("the store's social image, else the logo", async () => {
    const ogInfo = (pageInfoResolvers as any).PageInfo.ogInfo;
    settings.socialSharingImage = stored;
    settings.logo = '/assets/logo.png';
    expect((await ogInfo({}, {}, {})).image).toBe(
      `${BASE}/images?src=${enc(stored)}&w=1200&q=80&f=jpeg`
    );
    delete settings.socialSharingImage;
    settings.logo = stored;
    expect((await ogInfo({}, {}, {})).image).toBe(
      `${BASE}/images?src=${enc(stored)}&w=1200&q=80&h=675&f=png`
    );
  });

  it('the email logo, with its size known and unknown', async () => {
    settings.logo = stored;
    settings.logoWidth = '400';
    settings.logoHeight = '88'; // fitted to 200 × 44, served at 2×
    expect(await buildEmailBodyFromTemplate('{{{storeInfo.logo.src}}}', {})).toBe(
      `${BASE}/images?src=${enc(stored)}&w=400&q=85&f=png`
    );
    delete settings.logoWidth;
    delete settings.logoHeight;
    // Same parameters as before; `q` now comes before `h`, as in the others
    expect(await buildEmailBodyFromTemplate('{{{storeInfo.logo.src}}}', {})).toBe(
      `${BASE}/images?src=${enc(stored)}&w=360&q=85&h=120&f=png`
    );
  });
});

describe('values the hand-built code got wrong', () => {
  it('the blog post social image keeps an uppercase scheme, and drops a script', async () => {
    rows.blog_post = [
      {
        blog_post_id: 3,
        uuid: 'u-1',
        name: 'Post',
        url_key: 'post',
        thumbnail: 'HTTPS://cdn.example.com/p.jpg'
      }
    ];
    // Was https://shop.example.comHTTPS://cdn.example.com/p.jpg
    expect(await ogImageOf(blogPostView)).toBe('HTTPS://cdn.example.com/p.jpg');
    rows.blog_post[0].thumbnail = 'javascript:alert(1)';
    expect(await ogImageOf(blogPostView)).toBeUndefined();
  });
});

describe('the favicon and the order email thumbnails', () => {
  const captured: Record<string, any> = {};
  beforeAll(() => {
    addProcessor('orderConfirmationEmailData', (data: any) => {
      captured.order = data;
      return data;
    });
  });

  it('the favicon fallback, when no favicon is uploaded', async () => {
    const pageInfo = await (pageInfoResolvers as any).Query.pageInfo(
      {},
      {},
      {}
    );
    expect(await pageInfo.favicon()).toBe(`${BASE}/assets/favicon.ico`);
  });

  it('local thumbnails get the base URL, cloud ones stay, none stays none, a script goes', async () => {
    rows.order = [
      {
        order_id: 1,
        uuid: 'order-1',
        order_number: '1001',
        customer_email: 'jane@example.com',
        currency: 'USD',
        grand_total: '10.0000',
        shipping_address_id: null,
        billing_address_id: null,
        created_at: new Date('2026-11-01T10:00:00Z')
      }
    ];
    rows.order_item = [
      { order_item_id: 1, product_name: 'A', qty: 1, thumbnail: LOCAL },
      { order_item_id: 2, product_name: 'B', qty: 1, thumbnail: CLOUD },
      { order_item_id: 3, product_name: 'C', qty: 1, thumbnail: null },
      // Was https://shop.example.comcatalog/d.jpg
      { order_item_id: 4, product_name: 'D', qty: 1, thumbnail: 'catalog/d.jpg' },
      { order_item_id: 5, product_name: 'E', qty: 1, thumbnail: 'javascript:alert(1)' }
    ];
    await sendOrderConfirmationEmail({
      order_id: 1,
      uuid: 'order-1',
      customer_email: 'jane@example.com'
    } as never);
    expect(captured.order.order.items.map((i: any) => i.thumbnail)).toEqual([
      'https://shop.example.com/assets/catalog/9424/1250/tee.jpg',
      CLOUD,
      null,
      'https://shop.example.com/catalog/d.jpg',
      ''
    ]);
  });
});

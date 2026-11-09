import { fileURLToPath } from 'url';
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll
} from '@jest/globals';
import { loadModuleRoutes } from '../../../../lib/router/loadModuleRoutes.js';
import {
  getProductUrl,
  getProductUrls
} from '../../services/product/productUrl.js';

/**
 * getProductUrl / getProductUrls: the one place that turns a product into its
 * storefront URL (it was written three times: Product.url, the cart item's
 * productUrl and the widget link resolver). The friendly path from
 * `url_rewrite` first, else the productView route; one query for a list;
 * `absolute` for emails and feeds. The real catalog routes, over a stand-in
 * pool.
 */
const SHIRT = '4b3a1c2d-0e9f-4a8b-9c7d-6e5f4a3b2c1d';
const MUG = '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b';
const NEW = '1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b'; // no url_rewrite row yet

const rewrites = [
  { entity_uuid: SHIRT, request_path: '/men/basic-tee' },
  { entity_uuid: MUG, request_path: '/coffee-mug' }
];
const queries: Array<{ text: string; values: unknown[] }> = [];
const fakePool = {
  async query(q: { text: string; values?: unknown[] }) {
    const values = Array.isArray(q.values) ? q.values : [];
    queries.push({ text: q.text, values });
    const wanted = new Set(values.flat().map(String));
    return { rows: rewrites.filter((r) => wanted.has(r.entity_uuid)) };
  },
  release() {}
};
const pool = fakePool as never;

const originalHome = process.env.EVERSHOP_HOME_URL;
beforeAll(() => {
  // The catalog module's real routes (productView = /product/:uuid)
  loadModuleRoutes(fileURLToPath(new URL('../..', import.meta.url)));
});
beforeEach(() => {
  queries.length = 0;
  delete process.env.EVERSHOP_HOME_URL;
});
afterAll(() => {
  if (originalHome === undefined) {
    delete process.env.EVERSHOP_HOME_URL;
  } else {
    process.env.EVERSHOP_HOME_URL = originalHome;
  }
});

describe('getProductUrl', () => {
  it('is the url_rewrite path when the product has one', async () => {
    expect(await getProductUrl(SHIRT, {}, pool)).toBe('/men/basic-tee');
  });

  it('is the productView route when it has none yet', async () => {
    expect(await getProductUrl(NEW, {}, pool)).toBe(`/product/${NEW}`);
  });

  it('takes a product row as well as a uuid', async () => {
    expect(await getProductUrl({ uuid: MUG }, {}, pool)).toBe('/coffee-mug');
  });

  it('reads only product rewrites', async () => {
    await getProductUrl(SHIRT, {}, pool);
    expect(queries).toHaveLength(1);
    expect(queries[0].text).toMatch(/FROM\s+"?url_rewrite"?/i);
    expect(queries[0].values.flat()).toContain('product');
  });

  it('absolute: the store base URL in front, sub-path included, for both kinds', async () => {
    process.env.EVERSHOP_HOME_URL = 'https://shop.example.com/store/';
    expect(await getProductUrl(SHIRT, { absolute: true }, pool)).toBe(
      'https://shop.example.com/store/men/basic-tee'
    );
    expect(await getProductUrl(NEW, { absolute: true }, pool)).toBe(
      `https://shop.example.com/store/product/${NEW}`
    );
  });
});

describe('getProductUrls', () => {
  it('keeps the order of the list, repeats included, with one query', async () => {
    expect(await getProductUrls([MUG, NEW, SHIRT, MUG], {}, pool)).toEqual([
      '/coffee-mug',
      `/product/${NEW}`,
      '/men/basic-tee',
      '/coffee-mug'
    ]);
    expect(queries).toHaveLength(1);
  });

  it('an empty list runs no query', async () => {
    expect(await getProductUrls([], {}, pool)).toEqual([]);
    expect(queries).toEqual([]);
  });

  it('finds the rewrite of an uppercase uuid, and keeps its spelling in the route URL', async () => {
    expect(
      await getProductUrls([SHIRT.toUpperCase(), NEW.toUpperCase()], {}, pool)
    ).toEqual(['/men/basic-tee', `/product/${NEW.toUpperCase()}`]);
    // Sent once, in lowercase, as Postgres returns it
    expect(queries[0].values[1]).toEqual([SHIRT, NEW]);
  });

  it('a value that is not a uuid gets the route URL and is not sent, the others keep theirs', async () => {
    expect(await getProductUrls(['not-a-uuid', SHIRT], {}, pool)).toEqual([
      '/product/not-a-uuid',
      '/men/basic-tee'
    ]);
    expect(queries[0].values[1]).toEqual([SHIRT]);
    queries.length = 0;
    expect(await getProductUrls(['not-a-uuid'], {}, pool)).toEqual([
      '/product/not-a-uuid'
    ]);
    expect(queries).toEqual([]);
  });

  it('sends the whole list as one parameter, however long', async () => {
    // More than Postgres's 65,535 bind parameters if each uuid were one
    const many = Array.from(
      { length: 70000 },
      (_, i) => `${i.toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`
    );
    const urls = await getProductUrls([...many, SHIRT], {}, pool);
    expect(urls).toHaveLength(70001);
    expect(urls[70000]).toBe('/men/basic-tee');
    expect(queries).toHaveLength(1);
    expect(queries[0].values).toHaveLength(2);
  });

  it('never releases a client it is given', async () => {
    let released = 0;
    const client = {
      query: fakePool.query,
      release() {
        released += 1;
      }
    };
    expect(await getProductUrl(SHIRT, {}, client as never)).toBe(
      '/men/basic-tee'
    );
    expect(released).toBe(0);
  });
});

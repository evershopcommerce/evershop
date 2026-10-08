import { generateUrlKey, isUrlKeyTaken } from '../../landingPages.js';

/**
 * url_key generation (theme-json-landing-pages D3). The manifest never carries
 * a url_key: it is derived from the page name at install, suffixed when taken,
 * and is merchant data from then on.
 */
const UUID = '2f7c1e4a-5b6d-4c8e-9f0a-1b2c3d4e5f60';

/** A pool stand-in whose `url_rewrite`/`landing_page` lookup hits a fixed set. */
function conn(taken: string[] = []) {
  return {
    query: async (_sql: string, params: unknown[]) => {
      const key = params[1] as string;
      return { rows: taken.includes(key) ? [{ ok: 1 }] : [] };
    }
  } as never;
}
const guard = (reserved: string[] = [], locales: string[] = []) => ({
  reserved: new Set(reserved),
  locales: new Set(locales)
});

describe('isUrlKeyTaken', () => {
  test('a static storefront route is taken without touching the DB', async () => {
    let queried = false;
    const spy = {
      query: async () => {
        queried = true;
        return { rows: [] };
      }
    } as never;
    expect(await isUrlKeyTaken(spy, 'cart', guard(['cart']))).toBe(true);
    expect(queried).toBe(false);
  });

  test('an enabled locale code is taken', async () => {
    expect(await isUrlKeyTaken(conn(), 'de', guard([], ['de']))).toBe(true);
  });

  test('an existing url_rewrite / landing page is taken', async () => {
    expect(await isUrlKeyTaken(conn(['sale']), 'sale', guard())).toBe(true);
    expect(await isUrlKeyTaken(conn(['sale']), 'other', guard())).toBe(false);
  });
});

describe('generateUrlKey', () => {
  const page = { uuid: UUID, name: 'Black Friday' };

  test('uses the plain slug when it is free', async () => {
    expect(await generateUrlKey(conn(), page, guard())).toBe('black-friday');
  });

  test('appends a random 5-digit suffix when the slug is taken', async () => {
    const key = await generateUrlKey(
      conn(['black-friday']),
      page,
      guard(),
      () => '95839'
    );
    expect(key).toBe('black-friday-95839');
  });

  test('keeps trying until a free suffix turns up', async () => {
    const suffixes = ['11111', '22222', '33333'];
    let i = 0;
    const key = await generateUrlKey(
      conn(['black-friday', 'black-friday-11111', 'black-friday-22222']),
      page,
      guard(),
      () => suffixes[i++]
    );
    expect(key).toBe('black-friday-33333');
  });

  test('a name shadowed by a static route is suffixed, not left unreachable', async () => {
    const key = await generateUrlKey(
      conn(),
      { uuid: UUID, name: 'Cart' },
      guard(['cart']),
      () => '40001'
    );
    expect(key).toBe('cart-40001');
  });

  test('a non-Latin name falls back to a uuid-derived key', async () => {
    expect(
      await generateUrlKey(conn(), { uuid: UUID, name: '黑色星期五' }, guard())
    ).toBe('landing-page-2f7c1e4a');
  });

  test('a pathological collision run ends in a uuid-suffixed key, never a loop', async () => {
    // Every candidate is taken: the generator must still terminate.
    const always = {
      query: async () => ({ rows: [{ ok: 1 }] })
    } as never;
    const key = await generateUrlKey(always, page, guard(), () => '12345');
    expect(key).toBe('black-friday-2f7c1e4a');
  });
});

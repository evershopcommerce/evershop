import { jest, describe, it, expect, beforeEach } from '@jest/globals';

let redirectRow: any = null;
let rewriteRow: any = null;
let currentTable = '';
const whereCalls: Array<[string, string, string, string]> = [];
const chain: any = {
  from: (t: string) => {
    currentTable = t;
    return chain;
  },
  where: (f: string, op: string, v: string) => {
    whereCalls.push([currentTable, f, op, v]);
    return chain;
  },
  orderBy: () => chain,
  load: jest.fn(async () =>
    currentTable === 'url_redirect' ? redirectRow : rewriteRow
  )
};
const select = jest.fn(() => chain);

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({ select }));
jest.unstable_mockModule(
  '../../../../../../../lib/postgres/connection.js',
  () => ({ pool: {} })
);
jest.unstable_mockModule(
  '../../../../../../../lib/locale/localeContext.js',
  () => ({ localizeUrl: (u: string) => u })
);

const redirectMw = (await import('../../redirect.js')).default as any;

async function run(req: any) {
  const res: any = { redirect: jest.fn() };
  const next = jest.fn();
  await redirectMw(req, res, next);
  return { res, next };
}

describe('redirect middleware', () => {
  beforeEach(() => {
    redirectRow = null;
    rewriteRow = null;
    whereCalls.length = 0;
    jest.clearAllMocks();
  });

  it('passes through when the route matched (not a would-be-404)', async () => {
    const { res, next } = await run({
      currentRoute: { id: 'productView' },
      method: 'GET',
      originalUrl: '/awesome-shoes'
    });
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('302s an old path to the new one, preserving the query string', async () => {
    redirectRow = { from_path: '/old', to_path: '/new' };
    const { res, next } = await run({
      currentRoute: { id: 'notFound' },
      method: 'GET',
      localePath: '/old',
      originalUrl: '/old?utm=x'
    });
    expect(res.redirect).toHaveBeenCalledWith(302, '/new?utm=x');
    expect(next).not.toHaveBeenCalled();
  });

  it('never 3xx a non-GET/HEAD request', async () => {
    redirectRow = { from_path: '/old', to_path: '/new' };
    const { res, next } = await run({
      currentRoute: { id: 'notFound' },
      method: 'POST',
      localePath: '/old',
      originalUrl: '/old'
    });
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('self-guard: does not loop when to_path == path', async () => {
    redirectRow = { from_path: '/x', to_path: '/x' };
    const { res, next } = await run({
      currentRoute: { id: 'notFound' },
      method: 'GET',
      localePath: '/x',
      originalUrl: '/x'
    });
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('passes through when no redirect row matches', async () => {
    const { res, next } = await run({
      currentRoute: { id: 'notFound' },
      method: 'GET',
      localePath: '/nope',
      originalUrl: '/nope'
    });
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  describe('bare-slug fallback', () => {
    it('302s a bare slug to its canonical nested path, preserving the query', async () => {
      rewriteRow = { request_path: '/men/copy-product' };
      const { res, next } = await run({
        currentRoute: { id: 'notFound' },
        method: 'GET',
        localePath: '/copy-product',
        originalUrl: '/copy-product?utm=x'
      });
      expect(res.redirect).toHaveBeenCalledWith(302, '/men/copy-product?utm=x');
      expect(next).not.toHaveBeenCalled();
    });

    it('matches with a boundary-anchored, wildcard-escaped LIKE pattern', async () => {
      rewriteRow = { request_path: '/men/my_key' };
      await run({
        currentRoute: { id: 'notFound' },
        method: 'GET',
        localePath: '/my_key',
        originalUrl: '/my_key'
      });
      expect(whereCalls).toContainEqual([
        'url_rewrite',
        'request_path',
        'LIKE',
        '%/my\\_key'
      ]);
    });

    it('does not fall back for multi-segment paths', async () => {
      rewriteRow = { request_path: '/men/copy-product' };
      const { res, next } = await run({
        currentRoute: { id: 'notFound' },
        method: 'GET',
        localePath: '/stale-category/copy-product',
        originalUrl: '/stale-category/copy-product'
      });
      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
      expect(
        whereCalls.filter(([table]) => table === 'url_rewrite')
      ).toHaveLength(0);
    });

    it('self-guard: does not 302 a slug to its own rewrite row', async () => {
      rewriteRow = { request_path: '/copy-product' };
      const { res, next } = await run({
        currentRoute: { id: 'notFound' },
        method: 'GET',
        localePath: '/copy-product',
        originalUrl: '/copy-product'
      });
      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it('a degenerate self redirect row still falls through to the fallback', async () => {
      redirectRow = { from_path: '/copy-product', to_path: '/copy-product' };
      rewriteRow = { request_path: '/men/copy-product' };
      const { res, next } = await run({
        currentRoute: { id: 'notFound' },
        method: 'GET',
        localePath: '/copy-product',
        originalUrl: '/copy-product'
      });
      expect(res.redirect).toHaveBeenCalledWith(302, '/men/copy-product');
      expect(next).not.toHaveBeenCalled();
    });

    it('passes through when nothing matches the slug', async () => {
      const { res, next } = await run({
        currentRoute: { id: 'notFound' },
        method: 'GET',
        localePath: '/ghost',
        originalUrl: '/ghost'
      });
      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });
});

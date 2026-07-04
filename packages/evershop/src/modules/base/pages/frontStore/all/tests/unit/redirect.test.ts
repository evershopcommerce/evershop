import { jest, describe, it, expect, beforeEach } from '@jest/globals';

let redirectRow: any = null;
const loadMock = jest.fn(async () => redirectRow);
const chain: any = { from: () => chain, where: () => chain, load: loadMock };
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
    redirectRow = null;
    const { res, next } = await run({
      currentRoute: { id: 'notFound' },
      method: 'GET',
      localePath: '/nope',
      originalUrl: '/nope'
    });
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});

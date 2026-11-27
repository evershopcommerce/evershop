import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll
} from '@jest/globals';

/**
 * A shared admin link opened by a logged-out user: the admin auth middleware
 * sends them to the login page with `?redirect=<the page>`, and the login
 * page sends them back there. Only admin paths on this site are accepted.
 */

let adminUserRow: Record<string, unknown> | null = null;

jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {}
}));
jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({
  select: () => ({
    from: () => ({
      where: () => ({
        and: () => ({
          load: async () => (adminUserRow ? { ...adminUserRow } : null)
        })
      })
    })
  })
}));
jest.unstable_mockModule('../../../cms/services/pageMetaInfo.js', () => ({
  setPageMetaInfo: () => {}
}));

type Middleware = (
  request: Record<string, any>,
  response: Record<string, any>,
  next: () => void
) => unknown;

let adminAuth: Middleware;
let adminLoginPage: Middleware;
let addRoute: (route: Record<string, unknown>) => void;
let emptyRoutes: () => void;

beforeAll(async () => {
  ({ addRoute, empty: emptyRoutes } = (await import(
    '../../../../lib/router/Router.js'
  )) as any);
  emptyRoutes();
  addRoute({ id: 'dashboard', path: '/admin', isAdmin: true, method: ['GET'] });
  addRoute({
    id: 'adminLogin',
    path: '/admin/login',
    isAdmin: true,
    method: ['GET']
  });
  ({ default: adminAuth } = (await import(
    '../../pages/admin/all/[context]auth.js'
  )) as unknown as { default: Middleware });
  ({ default: adminLoginPage } = (await import(
    '../../pages/admin/adminLogin/index.js'
  )) as unknown as { default: Middleware });
});

afterAll(() => {
  emptyRoutes();
});

beforeEach(() => {
  adminUserRow = null;
});

function fakeResponse() {
  return { redirect: jest.fn() };
}

/** Runs the admin auth middleware for a logged-out visitor. */
async function visitLoggedOut(
  method: string,
  originalUrl: string,
  routeId: string
) {
  const response = fakeResponse();
  const next = jest.fn();
  await adminAuth(
    {
      method,
      originalUrl,
      currentRoute: { id: routeId },
      session: { userID: undefined },
      locals: {},
      logoutUser: (callback: () => void) => callback()
    },
    response,
    next
  );
  return { response, next };
}

/** Runs the login page middleware with `?redirect=`. */
function openLoginPage(loggedIn: boolean, redirect?: unknown) {
  const response = fakeResponse();
  const next = jest.fn();
  adminLoginPage(
    {
      getCurrentUser: () => (loggedIn ? { admin_user_id: 1 } : null),
      query: redirect === undefined ? {} : { redirect }
    },
    response,
    next
  );
  return { response, next };
}

describe('admin auth middleware: logged-out visitor', () => {
  it('sends a GET page to the login page with ?redirect= set to it', async () => {
    const { response, next } = await visitLoggedOut(
      'GET',
      '/admin/orders/edit/0f6c?tab=activities',
      'orderEdit'
    );
    expect(next).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      `/admin/login?redirect=${encodeURIComponent(
        '/admin/orders/edit/0f6c?tab=activities'
      )}`
    );
  });

  it('adds no ?redirect= for the dashboard (login goes there anyway)', async () => {
    const { response } = await visitLoggedOut('GET', '/admin', 'dashboard');
    expect(response.redirect).toHaveBeenCalledWith('/admin/login');
  });

  it('adds no ?redirect= for a POST (it cannot be repeated after login)', async () => {
    const { response } = await visitLoggedOut(
      'POST',
      '/admin/products/save',
      'productSave'
    );
    expect(response.redirect).toHaveBeenCalledWith('/admin/login');
  });

  it('adds no ?redirect= for the logout route', async () => {
    const { response } = await visitLoggedOut(
      'GET',
      '/admin/user/logout',
      'adminLogoutJson'
    );
    expect(response.redirect).toHaveBeenCalledWith('/admin/login');
  });

  it('lets the login page itself through', async () => {
    const { response, next } = await visitLoggedOut(
      'GET',
      '/admin/login?redirect=%2Fadmin%2Forders',
      'adminLogin'
    );
    expect(next).toHaveBeenCalled();
    expect(response.redirect).not.toHaveBeenCalled();
  });

  it('lets a logged-in user through', async () => {
    adminUserRow = { admin_user_id: 1, password: 'hash' };
    const response = fakeResponse();
    const next = jest.fn();
    const request: Record<string, any> = {
      method: 'GET',
      originalUrl: '/admin/orders',
      currentRoute: { id: 'orderGrid' },
      session: { userID: 1 },
      locals: {}
    };
    await adminAuth(request, response, next);
    expect(next).toHaveBeenCalled();
    expect(response.redirect).not.toHaveBeenCalled();
    expect(request.locals.user).toEqual({ admin_user_id: 1 });
  });
});

describe('admin login page: logged-in user with ?redirect=', () => {
  it('goes to the admin page named in ?redirect=', () => {
    const { response } = openLoginPage(true, '/admin/orders?status=new');
    expect(response.redirect).toHaveBeenCalledWith('/admin/orders?status=new');
  });

  it('goes to the dashboard without ?redirect=', () => {
    const { response } = openLoginPage(true);
    expect(response.redirect).toHaveBeenCalledWith('/admin');
  });

  it.each([
    ['another site', '//evil.example/admin'],
    ['a backslash path', '/\\evil.example/admin'],
    ['an absolute URL', 'https://evil.example/admin'],
    ['a storefront page', '/cart'],
    ['a path that leaves /admin', '/admin/../cart'],
    ['a repeated parameter', ['/admin/orders', '//evil.example']]
  ])('goes to the dashboard for %s', (_label, redirect) => {
    const { response } = openLoginPage(true, redirect);
    expect(response.redirect).toHaveBeenCalledWith('/admin');
  });

  it('shows the form to a logged-out visitor', () => {
    const { response, next } = openLoginPage(false, '/admin/orders');
    expect(next).toHaveBeenCalled();
    expect(response.redirect).not.toHaveBeenCalled();
  });
});

describe('round trip', () => {
  it('returns the visitor to the page they opened, query string included', async () => {
    const page = '/admin/products/edit/9a1b?locale=vi&tab=media';
    const { response } = await visitLoggedOut('GET', page, 'productEdit');
    const loginUrl = new URL(response.redirect.mock.calls[0][0] as string, 'http://x');
    const login = openLoginPage(true, loginUrl.searchParams.get('redirect'));
    expect(login.response.redirect).toHaveBeenCalledWith(page);
  });
});

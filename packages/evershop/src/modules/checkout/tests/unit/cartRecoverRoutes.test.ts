import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * The two routes of a cart recovery link. `/cart/recover/<token>`
 * (`cartRecover`) only keeps the token in the session and redirects, so no
 * page with the token in its URL ever renders (trackers send the page URL).
 * `/cart/recover` (`cartRecoverConfirm`) shows the button for a valid link
 * (GET changes nothing) and restores on POST.
 */

const SID = 'visitor-session';
const CART = { cart_id: 1, uuid: 'u-1', sid: null, customer_id: null };
let decision: Record<string, unknown>;
let failDecision = false;
const restored: Array<{ cart: unknown; visitor: unknown }> = [];
const context: Record<string, unknown> = {};
const logged: unknown[] = [];

jest.unstable_mockModule('../../services/cartRecovery.js', () => ({
  decideCartRecovery: async (token: string | undefined, visitor: unknown) => {
    if (failDecision) throw new Error('database unavailable');
    return token ? decision : { action: 'invalid', visitor };
  },
  restoreCart: async (cart: unknown, visitor: unknown) => {
    restored.push({ cart, visitor });
    return { added: 0, skipped: 0 };
  },
  savedCartItems: async () => [{ product_name: 'Cup', qty: 2 }]
}));
jest.unstable_mockModule('../../../../lib/router/buildUrl.js', () => ({
  buildUrl: (routeId: string) =>
    ({ cartRecoverConfirm: '/cart/recover', login: '/account/login', cart: '/cart' })[routeId]
}));
jest.unstable_mockModule('../../../graphql/services/contextHelper.js', () => ({
  setContextValue: (_request: unknown, key: string, value: unknown) => {
    context[key] = value;
  }
}));
jest.unstable_mockModule('../../../cms/services/pageMetaInfo.js', () => ({
  setPageMetaInfo: () => undefined
}));
jest.unstable_mockModule('../../../../lib/locale/translate/translate.js', () => ({
  translate: (text: string) => text
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  error: (e: unknown) => logged.push(e),
  debug: () => undefined
}));

const { default: openLink } = await import('../../pages/frontStore/cartRecover/index.js');
const { default: recoverPage } = await import('../../pages/frontStore/cartRecoverConfirm/index.js');

function call(
  handler: (...args: never[]) => unknown,
  { method = 'GET', session = {}, params = {}, customerId }: {
    method?: string;
    session?: Record<string, unknown>;
    params?: Record<string, string>;
    customerId?: number;
  } = {}
) {
  const request = {
    method,
    params,
    session,
    sessionID: SID,
    getCurrentCustomer: () => (customerId ? { customer_id: customerId } : undefined)
  };
  const response = { redirect: jest.fn() };
  const next = jest.fn();
  return Promise.resolve(handler(request as never, response as never, next as never)).then(() => ({
    request,
    session,
    redirect: response.redirect,
    next
  }));
}

beforeEach(() => {
  decision = { action: 'invalid' };
  failDecision = false;
  restored.length = 0;
  logged.length = 0;
  for (const key of Object.keys(context)) delete context[key];
});

describe('/cart/recover/<token>', () => {
  it('keeps the token in the session and redirects to /cart/recover, never rendering', async () => {
    const { session, redirect, next } = await call(openLink, { params: { token: 'a.b.c' } });
    expect(session).toEqual({ cartRecovery: { token: 'a.b.c' } });
    expect(redirect).toHaveBeenCalledWith('/cart/recover');
    expect(next).not.toHaveBeenCalled();
  });
});

describe('/cart/recover', () => {
  const withToken = () => ({ cartRecovery: { token: 'a.b.c' } });

  it('a valid link: GET only shows the button (nothing changes, the token stays)', async () => {
    decision = { action: 'ready', cart: CART };
    const { session, next, redirect } = await call(recoverPage, { session: withToken() });
    expect(next).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(context.cartRecoveryStatus).toBe('ready');
    expect(context.cartRecoveryItems).toEqual([{ product_name: 'Cup', qty: 2 }]);
    expect(session).toEqual(withToken());
    expect(restored).toEqual([]);
  });

  it('the button (POST): restored, the session remembers it, on to the cart page', async () => {
    decision = { action: 'ready', cart: CART };
    const { session, redirect, next } = await call(recoverPage, { method: 'POST', session: withToken(), customerId: 18 });
    expect(restored).toEqual([{ cart: CART, visitor: { sessionId: SID, customer: { customer_id: 18 } } }]);
    expect(session).toEqual({ cartRecovery: { restored: true } });
    expect(redirect).toHaveBeenCalledWith('/cart');
    expect(next).not.toHaveBeenCalled();
  });

  it('after a restore, Back or a reload of /cart/recover goes to the cart page, not to "no longer valid"', async () => {
    const { redirect, next } = await call(recoverPage, { session: { cartRecovery: { restored: true } } });
    expect(redirect).toHaveBeenCalledWith('/cart');
    expect(next).not.toHaveBeenCalled();
  });

  it('a link used already: the page says so (token dropped); a POST goes to the cart page', async () => {
    decision = { action: 'restored' };
    const shown = await call(recoverPage, { session: withToken() });
    expect(shown.next).toHaveBeenCalled();
    expect(context.cartRecoveryStatus).toBe('restored');
    expect(shown.session).toEqual({});

    const posted = await call(recoverPage, { method: 'POST', session: withToken() });
    expect(posted.redirect).toHaveBeenCalledWith('/cart');
    expect(posted.next).not.toHaveBeenCalled();
    expect(restored).toEqual([]);
  });

  it("a customer's cart and a guest: to the login page, which comes back here (no token in its URL)", async () => {
    decision = { action: 'login' };
    const { session, redirect } = await call(recoverPage, { session: withToken() });
    expect(redirect).toHaveBeenCalledWith('/account/login?redirect=%2Fcart%2Frecover');
    expect(session).toEqual(withToken());
    expect(restored).toEqual([]);
  });

  it('a link that does not work: the page says so, the token is dropped; a POST goes back to the page', async () => {
    decision = { action: 'invalid' };
    const shown = await call(recoverPage, { session: withToken() });
    expect(shown.next).toHaveBeenCalled();
    expect(context.cartRecoveryStatus).toBe('invalid');
    expect(shown.session).toEqual({});

    const posted = await call(recoverPage, { method: 'POST', session: withToken() });
    expect(posted.redirect).toHaveBeenCalledWith('/cart/recover');
    expect(posted.next).not.toHaveBeenCalled();
    expect(restored).toEqual([]);
  });

  it('no token in the session (opened directly): the invalid page', async () => {
    const { next } = await call(recoverPage);
    expect(next).toHaveBeenCalled();
    expect(context.cartRecoveryStatus).toBe('invalid');
  });

  it('a failure is logged and shows the invalid page, not an error', async () => {
    failDecision = true;
    const { next, redirect } = await call(recoverPage, { session: withToken() });
    expect(logged).toHaveLength(1);
    expect(next).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(context.cartRecoveryStatus).toBe('invalid');
  });
});

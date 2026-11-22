import { jest, describe, it, expect, beforeAll } from '@jest/globals';

/**
 * The API routes read the admin and the customer session through one session
 * store for the whole process. They made a connect-pg-simple store for each
 * request; its first read starts a timer that deletes expired sessions and
 * starts itself again, so no store was ever freed (5.6 KB per request) and
 * each kept running its own delete.
 */

const SESSIONS: Record<string, Record<string, unknown>> = {
  'admin-sid': { userID: 1 },
  'customer-sid': { customerID: 7 }
};

const stores: FakeStore[] = [];
const reads: string[] = [];

class FakeStore {
  constructor() {
    stores.push(this);
  }

  get(
    sid: string,
    callback: (e: Error | null, data?: Record<string, unknown> | null) => void
  ) {
    reads.push(sid);
    if (sid === 'broken-sid') {
      callback(new Error('the session table is gone'));
    } else {
      callback(null, SESSIONS[sid] ?? null);
    }
  }
}

jest.unstable_mockModule('connect-pg-simple', () => ({
  default: () => FakeStore
}));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: { name: 'core pool' }
}));
// The user and the customer rows the middlewares load with the session's id
jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({
  select: () => ({
    from: (table: string) => ({
      where: (_column: string, _op: string, id: number) => ({
        and: () => ({
          load: async () =>
            table === 'admin_user' && id === 1
              ? { admin_user_id: 1, email: 'admin@example.test', password: 'h' }
              : table === 'customer' && id === 7
              ? { customer_id: 7, email: 'shopper@example.test', password: 'h' }
              : null
        })
      })
    })
  })
}));

type Middleware = (
  request: Record<string, any>,
  response: unknown,
  next: () => void
) => Promise<void>;

let adminLookup: Middleware;
let customerLookup: Middleware;
let adminCookie: string;
let customerCookie: string;
let getSessionStore: () => unknown;
let loadSession: (sid: string) => Promise<unknown>;

beforeAll(async () => {
  ({ default: adminLookup } = (await import(
    '../../api/global/[context]getCurrentUser.js'
  )) as unknown as { default: Middleware });
  ({ default: customerLookup } = (await import(
    '../../../customer/api/global/[context]getCurrentCustomer[auth].js'
  )) as unknown as { default: Middleware });
  adminCookie = (
    await import('../../services/getAdminSessionCookieName.js')
  ).getAdminSessionCookieName();
  customerCookie = (
    await import('../../services/getFrontStoreSessionCookieName.js')
  ).getFrontStoreSessionCookieName();
  ({ getSessionStore, loadSession } = await import(
    '../../services/sessionStore.js'
  ));
});

interface LookUpResult {
  locals: Record<string, any>;
  nextCalls: number;
}

/** Run a lookup middleware for a request with these signed cookies */
async function lookUp(
  middleware: Middleware,
  cookies: Record<string, string>
): Promise<LookUpResult> {
  const request = {
    signedCookies: cookies,
    getCurrentUser: () => undefined,
    getCurrentCustomer: () => undefined,
    locals: {} as Record<string, any>
  };
  let nextCalls = 0;
  await middleware(request, {}, () => {
    nextCalls += 1;
  });
  return { locals: request.locals, nextCalls };
}

describe('the session lookups of the API routes', () => {
  it('read every admin session through one store', async () => {
    const results: LookUpResult[] = [];
    for (let i = 0; i < 30; i += 1) {
      results.push(await lookUp(adminLookup, { [adminCookie]: 'admin-sid' }));
    }

    expect(stores).toHaveLength(1);
    expect(reads).toEqual(Array(30).fill('admin-sid'));
    results.forEach(({ locals, nextCalls }) => {
      expect(locals.user).toEqual({
        admin_user_id: 1,
        email: 'admin@example.test'
      });
      expect(nextCalls).toBe(1);
    });
  });

  it('read the customer sessions through that same store', async () => {
    reads.length = 0;
    const results: LookUpResult[] = [];
    for (let i = 0; i < 30; i += 1) {
      results.push(
        await lookUp(customerLookup, { [customerCookie]: 'customer-sid' })
      );
    }

    expect(stores).toHaveLength(1);
    expect(getSessionStore()).toBe(stores[0]);
    expect(reads).toEqual(Array(30).fill('customer-sid'));
    results.forEach(({ locals, nextCalls }) => {
      expect(locals.customer).toEqual({
        customer_id: 7,
        email: 'shopper@example.test'
      });
      expect(locals.sessionID).toBe('customer-sid');
      expect(nextCalls).toBe(1);
    });
  });

  it('read no session without the cookie, and none for a missing one', async () => {
    reads.length = 0;
    const admin = await lookUp(adminLookup, {});
    const customer = await lookUp(customerLookup, {});
    expect(reads).toEqual([]);
    expect(admin).toEqual({ locals: {}, nextCalls: 1 });
    expect(customer).toEqual({ locals: {}, nextCalls: 1 });

    const unknown = await lookUp(adminLookup, { [adminCookie]: 'gone-sid' });
    expect(unknown).toEqual({ locals: {}, nextCalls: 1 });
    await expect(loadSession('gone-sid')).resolves.toBeNull();
  });

  it('go on without a user when the store fails', async () => {
    const admin = await lookUp(adminLookup, { [adminCookie]: 'broken-sid' });
    const customer = await lookUp(customerLookup, {
      [customerCookie]: 'broken-sid'
    });
    expect(admin).toEqual({ locals: {}, nextCalls: 1 });
    expect(customer).toEqual({ locals: {}, nextCalls: 1 });
    await expect(loadSession('broken-sid')).rejects.toThrow(
      'the session table is gone'
    );
    expect(stores).toHaveLength(1);
  });
});

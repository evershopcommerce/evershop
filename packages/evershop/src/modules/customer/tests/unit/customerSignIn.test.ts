import { describe, expect, it, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import { createFakeDb, createFakeQueryBuilder } from './fakeQueryBuilder.js';

/**
 * Signing a customer in without a password, for an extension that confirmed
 * who they are some other way (a social login such as Google or GitHub):
 * find the account by email in any letter case (`getCustomerByEmail`), then
 * `request.loginCustomer(id)` for a session or `issueCustomerTokens(id)` for
 * a headless storefront. Only an active account gets a session or tokens.
 * The password login shares the session step, so both leave the same state.
 * No database: the query builder is replaced.
 */
process.env.JWT_CUSTOMER_SECRET = 'test-access-secret';
process.env.JWT_CUSTOMER_REFRESH_SECRET = 'test-refresh-secret';

const db = createFakeDb({
  customer: [
    {
      customer_id: 1,
      uuid: 'uuid-1',
      status: 1,
      group_id: 1,
      email: 'Jane@Example.com',
      password: bcrypt.hashSync('secret-123', 4),
      full_name: 'Jane',
      meta_data: { vip: { tier: 'gold' } },
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      is_google_login: true
    },
    {
      customer_id: 2,
      uuid: 'uuid-2',
      status: 0,
      group_id: 1,
      email: 'off@example.com',
      password: 'hash',
      full_name: 'Off'
    }
  ]
});
const qb = createFakeQueryBuilder(db);
jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({ ...qb }));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: qb.pool,
  getConnection: qb.getConnection
}));

const { getCustomerByEmail } = await import(
  '../../services/customer/getCustomerByEmail.js'
);
const { issueCustomerTokens } = await import(
  '../../services/customer/issueCustomerTokens.js'
);
const { default: bootstrap } = await import('../../bootstrap.js');
const { hookAfter } = await import('../../../../lib/util/hookable.js');
const { verifyToken, verifyRefreshToken, TOKEN_TYPES } = await import(
  '../../../../lib/util/jwt.js'
);
const { request: requestPrototype } = await import('express');
bootstrap();

const JANE_PAYLOAD = {
  customer_id: 1,
  group_id: 1,
  uuid: 'uuid-1',
  email: 'Jane@Example.com',
  full_name: 'Jane',
  status: 1,
  created_at: '2026-01-01',
  updated_at: '2026-01-01'
};

function fakeRequest(withSession = true): any {
  const request: any = Object.create(requestPrototype);
  request.locals = {};
  if (withSession) {
    request.session = {
      saved: 0,
      save(callback?: (e: Error | null) => void) {
        this.saved += 1;
        callback?.(null);
      }
    };
  }
  return request;
}

async function rejection(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (e) {
    return e as Error;
  }
  throw new Error('expected a rejection');
}

describe('getCustomerByEmail', () => {
  it('finds the account in any letter case, with extension columns, never the password', async () => {
    for (const email of ['jane@example.com', 'JANE@EXAMPLE.COM', 'Jane@Example.com']) {
      const customer = await getCustomerByEmail(email);
      expect(customer).toMatchObject({ customer_id: 1, is_google_login: true });
      expect(customer).not.toHaveProperty('password');
    }
  });

  it('returns a disabled account too, so the caller can refuse it', async () => {
    expect(await getCustomerByEmail('OFF@example.com')).toMatchObject({
      customer_id: 2,
      status: 0
    });
  });

  it('null for an unknown address, an empty one, or a wildcard', async () => {
    expect(await getCustomerByEmail('nobody@example.com')).toBeNull();
    expect(await getCustomerByEmail('')).toBeNull();
    expect(await getCustomerByEmail('%@example.com')).toBeNull();
  });
});

describe('request.loginCustomer', () => {
  it('signs an active customer in: session, safe payload, saved, hook run', async () => {
    // Like the other request methods' hooks: (result, ...arguments)
    const seen: number[] = [];
    hookAfter('loginCustomer', (result: unknown, customerId: number) => {
      seen.push(customerId);
    });
    const request = fakeRequest();
    const callback = jest.fn();
    await request.loginCustomer(1, callback);
    expect(request.session.customerID).toBe(1);
    expect(request.locals.customer).toEqual(JANE_PAYLOAD);
    expect(request.session.saved).toBe(1);
    expect(callback).toHaveBeenCalledWith(null);
    expect(seen).toEqual([1]);
  });

  it('refuses a disabled, unknown or malformed id and changes nothing', async () => {
    for (const id of [2, 99, '1', 0, -1, 1.5]) {
      const request = fakeRequest();
      const callback = jest.fn();
      const e = await rejection(request.loginCustomer(id as number, callback));
      expect(e.message).toBe('The customer does not exist or is disabled');
      expect(request.session.customerID).toBeUndefined();
      expect(request.locals.customer).toBeUndefined();
      expect(callback).not.toHaveBeenCalled();
    }
  });

  it('without a session (an API route) still answers the callback', async () => {
    const request = fakeRequest(false);
    const callback = jest.fn();
    await request.loginCustomer(1, callback);
    expect(request.locals.customer).toEqual(JANE_PAYLOAD);
    expect(callback).toHaveBeenCalledWith(null);
  });

  it('the password login leaves exactly the same state', async () => {
    const request = fakeRequest();
    await request.loginCustomerWithEmail('jane@EXAMPLE.com', 'secret-123');
    expect(request.session.customerID).toBe(1);
    expect(request.locals.customer).toEqual(JANE_PAYLOAD);
  });
});

describe('issueCustomerTokens', () => {
  it('signs the tokens POST /api/customer/tokens returns, with the safe payload', async () => {
    const { accessToken, refreshToken } = await issueCustomerTokens(1);
    expect(verifyToken(accessToken, TOKEN_TYPES.CUSTOMER).customer).toEqual(
      JANE_PAYLOAD
    );
    expect(
      verifyRefreshToken(refreshToken, TOKEN_TYPES.CUSTOMER).customer
    ).toEqual(JANE_PAYLOAD);
  });

  it('refuses a disabled or unknown customer', async () => {
    for (const id of [2, 99]) {
      const e = await rejection(issueCustomerTokens(id));
      expect(e.message).toBe('The customer does not exist or is disabled');
    }
  });
});

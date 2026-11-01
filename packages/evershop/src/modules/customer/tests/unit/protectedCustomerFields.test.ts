import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * `POST /api/customers` is public: the storefront sign-up uses it, and so does
 * an admin creating a customer. `PATCH /api/customers/me` lets a customer edit
 * their own profile. Both pass the request body to a customer service, which
 * writes any key that is a column, so the route removes the fields only the
 * store may set: the group (prices, taxes, promotions), the status, the custom
 * fields (`meta_data`, written only by the admin metafield route) and the
 * columns the database fills. An admin keeps them on create. Columns an
 * extension adds still pass through. The create response never carries the
 * stored password hash.
 */
const created: Record<string, unknown>[] = [];
const updated: Array<{ uuid: string; data: Record<string, unknown> }> = [];

jest.unstable_mockModule('../../services/customer/createCustomer.js', () => ({
  default: async (data: Record<string, unknown>) => {
    created.push(data);
    return {
      customer_id: 7,
      uuid: 'new-uuid',
      status: data.status ?? 1,
      group_id: data.group_id ?? 1,
      email: data.email,
      full_name: data.full_name,
      password: '$2b$10$storedhashstoredhashstoredhashstoredhashstoredhash12',
      meta_data: {}
    };
  }
}));
jest.unstable_mockModule('../../services/customer/updateCustomer.js', () => ({
  default: async (uuid: string, data: Record<string, unknown>) => {
    updated.push({ uuid, data });
    return { uuid, email: 'jane@example.com', full_name: 'Jane' };
  }
}));
jest.unstable_mockModule('../../../../lib/router/buildUrl.js', () => ({
  buildUrl: () => '/url'
}));
jest.unstable_mockModule('../../../../lib/middleware/delegate.js', () => ({
  setDelegate: () => undefined
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  error: () => undefined
}));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {}
}));
jest.unstable_mockModule('../../../../lib/locale/translate/translate.js', () => ({
  translate: (text: string) => text
}));

const { default: createHandler } = await import(
  '../../api/createCustomer/[bodyParser]createCustomer.js'
);
const { default: updateProfileHandler } = await import(
  '../../api/updateCustomerProfile/updateProfile.js'
);

// What a caller could send on top of a normal sign-up or profile form.
const STORE_FIELDS = {
  group_id: 2,
  status: 0,
  meta_data: { vip: { tier: 'gold' } },
  uuid: 'chosen-uuid',
  customer_id: 1,
  created_at: '2001-01-01',
  updated_at: '2001-01-01'
};
// A column an extension added, which its sign-up or profile form may carry.
const EXTENSION_FIELD = { phone: '+84 90 000 0000' };
const SIGN_UP = {
  email: 'jane@example.com',
  full_name: 'Jane',
  password: 'secret-123'
};

function call(
  handler: (req: any, res: any, next: () => void) => unknown,
  body: Record<string, unknown>,
  who: { admin?: object; customer?: object } = {}
) {
  const response: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.jsonBody = payload;
      return this;
    }
  };
  const request: any = {
    body,
    currentRoute: { id: 'route' },
    getCurrentUser: () => who.admin,
    getCurrentCustomer: () => who.customer
  };
  return Promise.resolve(handler(request, response, () => undefined)).then(
    () => response
  );
}

beforeEach(() => {
  created.length = 0;
  updated.length = 0;
});

describe('POST /api/customers', () => {
  it('a visitor signing up cannot set the group, status, custom fields or database columns', async () => {
    await call(createHandler, { ...SIGN_UP, ...STORE_FIELDS, ...EXTENSION_FIELD });
    expect(created).toEqual([{ ...SIGN_UP, ...EXTENSION_FIELD }]);
  });

  it('a signed-in customer is treated the same as a visitor', async () => {
    await call(createHandler, { ...SIGN_UP, ...STORE_FIELDS }, {
      customer: { uuid: 'someone' }
    });
    expect(created).toEqual([SIGN_UP]);
  });

  it('an admin (session or admin token) still sets them', async () => {
    const body = { ...SIGN_UP, ...STORE_FIELDS, ...EXTENSION_FIELD };
    await call(createHandler, body, { admin: { admin_user_id: 1 } });
    expect(created).toEqual([body]);
  });

  it('the response never carries the stored password hash', async () => {
    for (const who of [{}, { admin: { admin_user_id: 1 } }]) {
      const response = await call(createHandler, SIGN_UP, who);
      expect(response.$body.data).not.toHaveProperty('password');
      expect(response.$body.data).toMatchObject({
        uuid: 'new-uuid',
        email: 'jane@example.com',
        full_name: 'Jane'
      });
    }
  });
});

describe('PATCH /api/customers/me', () => {
  const customer = { uuid: 'me', email: 'jane@example.com' };

  it('a customer cannot set the group, status, password, custom fields or database columns', async () => {
    await call(
      updateProfileHandler,
      { full_name: 'Jane B', password: 'x', ...STORE_FIELDS, ...EXTENSION_FIELD },
      { customer }
    );
    expect(updated).toEqual([
      { uuid: 'me', data: { full_name: 'Jane B', ...EXTENSION_FIELD } }
    ]);
  });

  it('a body with only those fields is refused as empty', async () => {
    const response = await call(updateProfileHandler, { ...STORE_FIELDS }, { customer });
    expect(response.statusCode).toBe(400);
    expect(response.jsonBody.error.message).toBe('There is nothing to update');
    expect(updated).toEqual([]);
  });
});

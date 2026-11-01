import { beforeEach, describe, expect, it, jest } from '@jest/globals';

/**
 * Extensions protect their own customer columns with the
 * `protectedCustomerFields` registry value. They can only add: a core field an
 * extension leaves out stays protected. A processor that returns something
 * other than a list of field names stops the request instead of letting the
 * body through.
 */
const created: Record<string, unknown>[] = [];
const updated: Record<string, unknown>[] = [];

jest.unstable_mockModule('../../services/customer/createCustomer.js', () => ({
  default: async (data: Record<string, unknown>) => {
    created.push(data);
    return { uuid: 'new-uuid', email: data.email, password: 'hash' };
  }
}));
jest.unstable_mockModule('../../services/customer/updateCustomer.js', () => ({
  default: async (uuid: string, data: Record<string, unknown>) => {
    updated.push(data);
    return { uuid };
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

const { addProcessor } = await import('../../../../lib/util/registry.js');
const { default: createHandler } = await import(
  '../../api/createCustomer/[bodyParser]createCustomer.js'
);
const { default: updateProfileHandler } = await import(
  '../../api/updateCustomerProfile/updateProfile.js'
);

// What an extension's bootstrap would register: one column protected on every
// route, one only on sign-up, and (later) an attempt to unprotect core fields.
addProcessor('protectedCustomerFields', (fields: string[]) => [
  ...fields,
  'credit_limit'
]);
addProcessor('protectedCustomerFields', function signUpOnly(
  this: { routeId: string },
  fields: string[]
) {
  return this.routeId === 'createCustomer' ? [...fields, 'loyalty_tier'] : fields;
});
addProcessor(
  'protectedCustomerFields',
  (fields: string[]) => fields.filter((f) => f !== 'group_id' && f !== 'status'),
  20
);

const BODY = {
  email: 'jane@example.com',
  full_name: 'Jane',
  password: 'secret-123',
  group_id: 2,
  status: 0,
  credit_limit: 5000,
  loyalty_tier: 'gold',
  phone: '+84 90 000 0000'
};

function call(
  handler: (req: any, res: any, next: () => void) => unknown,
  routeId: string,
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
    currentRoute: { id: routeId },
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

describe('the protectedCustomerFields registry value', () => {
  it('sign-up: the fields extensions add are removed, and core fields stay removed', async () => {
    await call(createHandler, 'createCustomer', BODY);
    expect(created).toEqual([
      {
        email: 'jane@example.com',
        full_name: 'Jane',
        password: 'secret-123',
        phone: '+84 90 000 0000'
      }
    ]);
  });

  it('profile: the processor sees the route, so a sign-up-only field passes there', async () => {
    const { email, password, ...profile } = BODY;
    await call(updateProfileHandler, 'updateCustomerProfile', { ...profile, password }, {
      customer: { uuid: 'me', email }
    });
    expect(updated).toEqual([
      { full_name: 'Jane', loyalty_tier: 'gold', phone: '+84 90 000 0000' }
    ]);
  });

  it('an admin still sets everything', async () => {
    await call(createHandler, 'createCustomer', BODY, { admin: { admin_user_id: 1 } });
    expect(created).toEqual([BODY]);
  });

  it('a processor that returns something else stops the request', async () => {
    addProcessor('protectedCustomerFields', () => 'credit_limit' as unknown as string[], 30);
    // A route id not used before, so the registry's cache does not answer
    const response = await call(createHandler, 'createCustomerAfterBadProcessor', BODY);
    expect(response.statusCode).toBe(500);
    expect(created).toEqual([]);
  });
});

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  createFakeDb,
  createFakeQueryBuilder,
  type FakeDb
} from '../../../customer/tests/unit/fakeQueryBuilder.js';

/**
 * A cart and the browser session (cart.sid). Signing out kept the session,
 * so the cart of the customer who signed out stayed linked to it, and the
 * next person on that browser was handed it — items, billing name, phone
 * and address: `[auth]addCustomerToCart` rewrote its owner to whoever
 * signed in, and `getMyCart` returned the session's cart before asking whose
 * it was. Found on a marketplace built on core (BUG-110). No database.
 */

const SID = 'browser-session-1';
const A = 18;
const B = 19;

let db: FakeDb;
let qb: ReturnType<typeof createFakeQueryBuilder>;
let failUpdates = false;

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({
  select: (...args: unknown[]) => (qb.select as (...a: unknown[]) => unknown)(...args),
  update: (...args: unknown[]) => {
    if (failUpdates) throw new Error('database unavailable');
    return (qb.update as (...a: unknown[]) => unknown)(...args);
  }
}));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {},
  getConnection: async () => ({})
}));
// The full cart build needs the whole checkout module; the uuid says which cart came back.
jest.unstable_mockModule('../../services/cart/Cart.js', () => ({
  getCart: async (uuid: string) => ({ uuid }),
  Cart: class {},
  Item: class {},
  createNewCart: async () => ({})
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  error: () => undefined,
  debug: () => undefined,
  info: () => undefined,
  warning: () => undefined
}));

const { getMyCart } = await import('../../services/getMyCart.js');
const { default: addCustomerToCart } = await import(
  '../../pages/frontStore/all/[auth]addCustomerToCart.js'
);
const { default: logoutCustomer } = await import(
  '../../../customer/services/customer/logoutCustomer.js'
);

function seed(carts: Array<Record<string, unknown>>) {
  db = createFakeDb({ cart: carts });
  qb = createFakeQueryBuilder(db);
}
const cart = (id: number) => db.tables.cart.find((c) => c.cart_id === id)!;

/** A front-store page request for the session, signed in as `customerId` (or a guest). */
async function visitPage(customerId?: number) {
  const next = jest.fn();
  const customer =
    customerId === undefined
      ? undefined
      : { customer_id: customerId, group_id: 1, full_name: `Customer ${customerId}`, email: `c${customerId}@x.io` };
  await addCustomerToCart(
    { sessionID: SID, getCurrentCustomer: () => customer } as never,
    {} as never,
    next
  );
  expect(next).toHaveBeenCalled();
}

async function signOut(customerId: number) {
  const request = { session: { customerID: customerId }, sessionID: SID, locals: { customer: {} } };
  await (logoutCustomer as (this: unknown) => Promise<void>).call(request);
  expect(request.session.customerID).toBeUndefined();
}

beforeEach(() => {
  failUpdates = false;
});

describe('BUG-110: A signs out, B signs in on the same browser', () => {
  it("B never gets A's cart; A gets it back at their next sign-in", async () => {
    seed([
      // A's cart, on this browser, with A's billing address on it
      { cart_id: 10, uuid: 'cart-a', status: 1, sid: SID, customer_id: A, billing_address_id: 6 },
      // B's own cart from another browser
      { cart_id: 11, uuid: 'cart-b', status: 1, sid: 'b-elsewhere', customer_id: B }
    ]);

    await signOut(A);
    expect(cart(10).sid).toBeNull();

    await visitPage(B); // B signs in and opens a page
    expect(await getMyCart(SID, B)).toEqual({ uuid: 'cart-b' });
    expect(cart(10).customer_id).toBe(A); // A's cart, A's address — untouched
    expect(cart(11).sid).toBe(SID);

    expect(await getMyCart('a-next-session', A)).toEqual({ uuid: 'cart-a' });
    expect(cart(10).sid).toBe('a-next-session');
  });
});

describe('getMyCart refuses another customer’s cart on the session', () => {
  it('a customer signed in over it gets their own cart, and it is unlinked', async () => {
    seed([
      { cart_id: 10, uuid: 'cart-a', status: 1, sid: SID, customer_id: A },
      { cart_id: 11, uuid: 'cart-b', status: 1, sid: 'b-elsewhere', customer_id: B }
    ]);
    expect(await getMyCart(SID, B)).toEqual({ uuid: 'cart-b' });
    expect(cart(10)).toMatchObject({ sid: null, customer_id: A });
  });

  it('a guest gets nothing, and it is unlinked', async () => {
    seed([{ cart_id: 10, uuid: 'cart-a', status: 1, sid: SID, customer_id: A }]);
    expect(await getMyCart(SID)).toBeNull();
    expect(cart(10).sid).toBeNull();
  });

  it('a guest cart, or the customer’s own, is returned as before', async () => {
    seed([{ cart_id: 12, uuid: 'cart-guest', status: 1, sid: SID, customer_id: null }]);
    expect(await getMyCart(SID)).toEqual({ uuid: 'cart-guest' });
    expect(await getMyCart(SID, B)).toEqual({ uuid: 'cart-guest' });
    seed([{ cart_id: 10, uuid: 'cart-a', status: 1, sid: SID, customer_id: A }]);
    expect(await getMyCart(SID, A)).toEqual({ uuid: 'cart-a' });
    expect(cart(10).sid).toBe(SID);
  });
});

describe('[auth]addCustomerToCart claims only a guest cart', () => {
  it('a guest cart becomes the signed-in customer’s (unchanged behaviour)', async () => {
    seed([{ cart_id: 12, uuid: 'cart-guest', status: 1, sid: SID, customer_id: null }]);
    await visitPage(B);
    expect(cart(12)).toMatchObject({
      customer_id: B,
      customer_full_name: `Customer ${B}`,
      customer_email: `c${B}@x.io`,
      sid: SID
    });
  });

  it('another customer’s cart is unlinked, never re-owned', async () => {
    seed([{ cart_id: 10, uuid: 'cart-a', status: 1, sid: SID, customer_id: A, customer_email: 'a@x.io' }]);
    await visitPage(B);
    expect(cart(10)).toMatchObject({ customer_id: A, customer_email: 'a@x.io', sid: null });
  });
});

describe('logoutCustomer unlinks the customer’s cart from the session', () => {
  it('only the signed-out customer’s active cart on this session', async () => {
    seed([
      { cart_id: 10, uuid: 'cart-a', status: 1, sid: SID, customer_id: A },
      { cart_id: 13, uuid: 'cart-a-other', status: 1, sid: 'a-elsewhere', customer_id: A }
    ]);
    await signOut(A);
    expect(cart(10).sid).toBeNull();
    expect(cart(13).sid).toBe('a-elsewhere');
  });

  it('a failure to unlink never blocks the sign-out', async () => {
    seed([{ cart_id: 10, uuid: 'cart-a', status: 1, sid: SID, customer_id: A }]);
    failUpdates = true;
    await signOut(A); // resolves, and the customer is signed out
  });
});

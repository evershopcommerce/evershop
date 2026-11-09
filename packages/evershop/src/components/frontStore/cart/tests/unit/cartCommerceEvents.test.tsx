import '../../../customer/address/tests/unit/domSetup.js';
import type { AnyCommerceEvent } from '@evershop/evershop/types/commerceEvents';
import { jest, describe, it, expect, afterEach, beforeEach } from '@jest/globals';

/**
 * The cart's commerce events (`CartContext`): each cart change publishes
 * its event once the server accepted it and the new cart has arrived.
 * - add, remove and quantity change: `product_added_to_cart` or
 *   `product_removed_from_cart` with the changed qty (2 → 5 is "added" 3);
 * - coupon applied or removed; shipping method chosen; a guest's email
 *   saved (no refetch: the email changes no amount);
 * - nothing when the server refuses the change.
 *
 * The real CartProvider, with a fake urql client (it returns `nextCart`) and
 * a fake fetch for the cart APIs.
 */
let nextCart: unknown;
let refetches = 0;
const fakeClient = {
  query: () => {
    refetches += 1;
    return {
      toPromise: async () => ({ data: { myCart: nextCart } })
    };
  }
};
jest.unstable_mockModule('urql', () => ({
  useClient: () => fakeClient,
  useQuery: () => [{ data: undefined, fetching: false, error: undefined }, () => undefined]
}));

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { CartProvider, useCartDispatch, useCartState } = await import('../../CartContext.js');
const { onCommerceEvent } = await import('../../../../common/commerceEvents.js');

const money = (value: number) => ({ value, text: String(value) });
const tee = (qty: number) => ({
  cartItemId: 'ci-1',
  uuid: 'line-1',
  productId: '12',
  variantGroupId: null,
  productSku: 'TEE',
  productName: 'Tee',
  qty,
  productUrl: '/tee',
  thumbnail: null,
  finalPrice: money(10),
  finalPriceInclTax: money(11),
  lineTotal: money(10 * qty),
  lineTotalWithDiscount: money(10 * qty),
  variantOptions: [],
  removeApi: '/api/carts/cart-1/items/line-1',
  updateQtyApi: '/api/carts/cart-1/items/line-1'
});
const makeCart = (items: unknown[], extra: Record<string, unknown> = {}) => ({
  uuid: 'cart-1',
  currency: 'USD',
  coupon: null,
  totalQty: items.reduce((sum: number, i) => sum + (i as { qty: number }).qty, 0),
  items,
  addItemApi: '/api/carts/cart-1/items',
  applyCouponApi: '/api/carts/cart-1/coupons',
  removeCouponApi: '/api/carts/cart-1/coupons/TEN',
  addShippingMethodApi: '/api/carts/cart-1/shippingMethods',
  error: null,
  errors: [],
  ...extra
});

let actions: ReturnType<typeof useCartDispatch>;
let cartState: ReturnType<typeof useCartState>;
function Probe() {
  actions = useCartDispatch();
  cartState = useCartState();
  return null;
}

/** Wait for the bus: a frame, then a task per listener */
const settle = async () => {
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

describe('cart commerce events', () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;
  const realFetch = globalThis.fetch;
  let apiResponse: { ok: boolean; body: unknown };
  let events: AnyCommerceEvent[];
  let stop: () => void;

  async function mount(cart: unknown) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <CartProvider
          cart={cart as never}
          query="query { myCart { uuid } }"
          addMineCartItemApi="/api/cart/mine/items"
        >
          <Probe />
        </CartProvider>
      );
    });
  }

  beforeEach(() => {
    delete (window as unknown as Record<string, unknown>).__evershopCommerceEvents;
    events = [];
    stop = onCommerceEvent('*', (e) => events.push(e));
    apiResponse = { ok: true, body: { data: {} } };
    globalThis.fetch = (async () => ({
      ok: apiResponse.ok,
      json: async () => apiResponse.body
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    stop();
    act(() => root.unmount());
    container.remove();
    globalThis.fetch = realFetch;
  });

  async function run(change: () => Promise<unknown>) {
    await act(async () => {
      await change().catch(() => undefined);
    });
    await settle();
  }

  it('adding a new product: added, with the line and the whole cart', async () => {
    await mount(makeCart([]));
    nextCart = makeCart([tee(2)]);
    apiResponse.body = { data: { item: { uuid: 'line-1' }, count: 2, cartId: 'cart-1' } };
    await run(() => actions.addItem({ sku: 'TEE', qty: 2 }));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: 'product_added_to_cart',
      data: {
        currency: 'USD',
        value: 20,
        items: [{ sku: 'TEE', productId: 12, qty: 2, price: 10, url: 'http://localhost/tee' }],
        lineQty: 2,
        previousLineQty: 0,
        cart: { cartId: 'cart-1', value: 20, totalQty: 2 }
      }
    });
  });

  it('adding more of a product in the cart: added, with only the new qty', async () => {
    await mount(makeCart([tee(1)]));
    nextCart = makeCart([tee(3)]);
    apiResponse.body = { data: { item: { uuid: 'line-1' } } };
    await run(() => actions.addItem({ sku: 'TEE', qty: 2 }));

    expect(events.map((e) => e.name)).toEqual(['product_added_to_cart']);
    expect(events[0].data).toMatchObject({
      value: 20,
      items: [{ qty: 2 }],
      lineQty: 3,
      previousLineQty: 1
    });
  });

  it('a quantity change: 2 → 5 is added 3, 5 → 2 is removed 3', async () => {
    await mount(makeCart([tee(2)]));
    nextCart = makeCart([tee(5)]);
    await run(() => actions.updateItem('ci-1', { qty: 3, action: 'increase' }));
    nextCart = makeCart([tee(2)]);
    await run(() => actions.updateItem('ci-1', { qty: 3, action: 'decrease' }));

    expect(
      events.map((e) => [e.name, (e.data as { items: Array<{ qty: number }> }).items[0].qty])
    ).toEqual([
      ['product_added_to_cart', 3],
      ['product_removed_from_cart', 3]
    ]);
  });

  it('removing a line: removed, with its whole qty', async () => {
    await mount(makeCart([tee(2)]));
    nextCart = makeCart([]);
    await run(() => actions.removeItem('ci-1'));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: 'product_removed_from_cart',
      data: { value: 20, items: [{ sku: 'TEE', qty: 2 }], lineQty: 0, previousLineQty: 2 }
    });
  });

  it('coupons: applied with the code, removed with the code it had', async () => {
    await mount(makeCart([tee(1)]));
    nextCart = makeCart([tee(1)], { coupon: 'TEN' });
    await run(() => actions.applyCoupon('ten'));
    nextCart = makeCart([tee(1)]);
    await run(() => actions.removeCoupon());

    expect(events.map((e) => e.name)).toEqual(['coupon_applied', 'coupon_removed']);
    expect(events[0].data).toMatchObject({ coupon: 'TEN', cart: { coupon: 'TEN' } });
    expect(events[1].data).toMatchObject({ coupon: 'TEN', cart: { coupon: undefined } });
  });

  it('a shipping method: checkout_shipping_info_submitted, with the cart', async () => {
    await mount(makeCart([tee(1)]));
    nextCart = makeCart([tee(1)]);
    await run(() => actions.addShippingMethod('flat', 'Flat rate', 'core'));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: 'checkout_shipping_info_submitted',
      data: { shippingMethod: { code: 'flat', name: 'Flat rate' }, cartId: 'cart-1', value: 10 }
    });
  });

  it('a guest email: checkout_contact_info_submitted with the cart, without the email', async () => {
    await mount(makeCart([tee(1)], { addContactInfoApi: '/api/carts/cart-1/contacts' }));
    apiResponse.body = { data: { email: 'jane@example.com' } };
    refetches = 0;
    await run(() => actions.addContactInfo({ email: 'jane@example.com' }));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: 'checkout_contact_info_submitted',
      data: { cartId: 'cart-1', currency: 'USD', value: 10, totalQty: 1, loggedIn: false }
    });
    expect(JSON.stringify(events[0])).not.toContain('jane');
    // The cart has the email, without a refetch and without a loading flag left on
    expect(cartState.data?.customerEmail).toBe('jane@example.com');
    expect(refetches).toBe(0);
    expect(cartState.loadingStates.addingContactInfo).toBe(false);
  });

  it('a customer\'s cart (code that calls addContactInfo for a logged-in customer): loggedIn', async () => {
    await mount(makeCart([tee(1)], { addContactInfoApi: '/api/carts/cart-1/contacts', customerId: 7 }));
    apiResponse.body = { data: { email: 'jane@example.com' } };
    await run(() => actions.addContactInfo({ email: 'jane@example.com' }));
    expect(events.map((e) => [e.name, (e.data as { loggedIn: boolean }).loggedIn])).toEqual([
      ['checkout_contact_info_submitted', true]
    ]);
  });

  it('a guest email the server refuses: no event, no cart error, the caller gets the error', async () => {
    await mount(makeCart([tee(1)], { addContactInfoApi: '/api/carts/cart-1/contacts' }));
    apiResponse = { ok: false, body: { error: { message: 'Invalid cart' } } };
    let thrown: unknown;
    await act(async () => {
      await actions.addContactInfo({ email: 'jane@example.com' }).catch((e) => {
        thrown = e;
      });
    });
    await settle();

    expect((thrown as Error).message).toBe('Invalid cart');
    expect(events).toEqual([]);
    // The cart error shows in the coupon form: a background save stays out of it
    expect(cartState.data?.error).toBeNull();
    expect(cartState.data?.customerEmail).toBeUndefined();
    expect(cartState.loadingStates.addingContactInfo).toBe(false);
  });

  it('nothing when the server refuses the change', async () => {
    await mount(makeCart([tee(1)]));
    apiResponse = { ok: false, body: { error: { message: 'Out of stock' } } };
    nextCart = makeCart([tee(3)]);
    await run(() => actions.addItem({ sku: 'TEE', qty: 2 }));
    await run(() => actions.applyCoupon('NOPE'));
    expect(events).toEqual([]);
  });

  it('a listener that throws does not break the cart change', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const stopBroken = onCommerceEvent('product_added_to_cart', () => {
      throw new Error('pixel broke');
    });
    try {
      await mount(makeCart([]));
      nextCart = makeCart([tee(1)]);
      apiResponse.body = { data: { item: { uuid: 'line-1' } } };
      let result: unknown = 'not settled';
      await act(async () => {
        result = await actions.addItem({ sku: 'TEE', qty: 1 });
      });
      await settle();
      expect(result).toBeUndefined();
      expect(events.map((e) => e.name)).toEqual(['product_added_to_cart']);
    } finally {
      stopBroken();
      consoleError.mockRestore();
    }
  });
});

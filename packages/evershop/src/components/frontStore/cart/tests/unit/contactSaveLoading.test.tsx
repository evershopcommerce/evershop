import '../../../customer/address/tests/unit/domSetup.js';
import { jest, describe, it, expect, afterEach } from '@jest/globals';

/**
 * Spec C2: the checkout saves a guest's email in the background as soon as it
 * is entered (`CartContext.addContactInfo`). The email changes no amount, so
 * nothing shows as loading meanwhile: not the cart's `loading` (the item rows
 * and quantity buttons read it), not one of its `loadingStates` (the totals
 * and the phone order summary read them). A live check found the item rows,
 * the totals and the phone summary flashing as loading at each email change
 * when the save set `addingContactInfo`.
 */
jest.unstable_mockModule('urql', () => ({
  useClient: () => ({
    query: () => ({ toPromise: async () => ({ data: { myCart: null } }) })
  }),
  useQuery: () => [{ data: undefined, fetching: false, error: undefined }, () => undefined]
}));

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { AppProvider } = await import('../../../../common/context/app.js');
const { CartProvider, useCartDispatch, useCartState } = await import('../../CartContext.js');
const { CartTotalSummary } = await import('../../CartTotalSummary.js');

const cart = {
  uuid: 'cart-1',
  currency: 'USD',
  items: [],
  addContactInfoApi: '/api/carts/cart-1/contacts',
  addShippingMethodApi: '/api/carts/cart-1/shippingMethods',
  error: null,
  errors: []
};

let actions: ReturnType<typeof useCartDispatch>;
const loadingSeen: boolean[] = [];
const cartLoadingSeen: boolean[] = [];
function Probe() {
  actions = useCartDispatch();
  const { loading, loadingStates } = useCartState();
  cartLoadingSeen.push(
    loading ||
      Object.values(loadingStates).some((state) => state === true || (typeof state === 'string' && state !== null))
  );
  return (
    <CartTotalSummary>
      {({ loading }) => {
        loadingSeen.push(loading);
        return null;
      }}
    </CartTotalSummary>
  );
}

describe('the cart while a guest email is saved', () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;
  const realFetch = globalThis.fetch;
  let release: () => void = () => undefined;

  afterEach(() => {
    release();
    act(() => root.unmount());
    container.remove();
    globalThis.fetch = realFetch;
  });

  async function mount() {
    // Every API call waits until `release()`
    globalThis.fetch = (() =>
      new Promise((resolve) => {
        release = () =>
          resolve({ ok: true, json: async () => ({ data: { email: 'jane@example.com' } }) } as Response);
      })) as typeof fetch;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <AppProvider value={{ config: { tax: { priceIncludingTax: false } } } as never}>
          <CartProvider cart={cart as never} query="query { myCart { uuid } }" addMineCartItemApi="/api/cart/mine/items">
            <Probe />
          </CartProvider>
        </AppProvider>
      );
    });
    loadingSeen.length = 0;
    cartLoadingSeen.length = 0;
  }

  it('nothing shows as loading while the email is saved', async () => {
    await mount();
    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = actions.addContactInfo({ email: 'jane@example.com' });
    });
    await act(async () => {
      release();
      await pending;
    });
    // The provider rendered again (the email arrived), never as loading
    expect(cartLoadingSeen.length).toBeGreaterThan(0);
    expect(cartLoadingSeen).not.toContain(true);
    expect(loadingSeen).not.toContain(true);
  });

  it('the control: a shipping method shows as loading while it is saved', async () => {
    await mount();
    await act(async () => {
      actions.addShippingMethod('flat', 'Flat rate', 'core').catch(() => undefined);
    });
    expect(cartLoadingSeen.at(-1)).toBe(true);
    expect(loadingSeen.at(-1)).toBe(true);
  });
});

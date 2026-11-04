import '../../../customer/address/tests/unit/domSetup.js';
import { jest, describe, it, expect, afterEach, beforeEach } from '@jest/globals';

/**
 * Checkout re-quotes the shipping methods 800 ms after each change of the
 * address's geographic fields (Shipment.tsx). When the address changes again
 * while a quote is on the way (United States, then Canada) and the older
 * quote answers last, its methods replaced the newer ones: a Canadian
 * address listed the United States methods. Only the latest quote's answer
 * is kept now.
 *
 * The real CartProvider, with a fake urql client whose queries the test
 * holds open and answers in the order it chooses.
 */
type Deferred = {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
};
const deferred = (): Deferred => {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const queries: Array<{ variables: Record<string, unknown>; result: Deferred }> = [];
const fakeClient = {
  query: (_query: string, variables: Record<string, unknown>) => {
    const result = deferred();
    queries.push({ variables, result });
    return { toPromise: () => result.promise };
  }
};
jest.unstable_mockModule('urql', () => ({
  useClient: () => fakeClient
}));

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { CartProvider, useCartState, useCartDispatch } = await import(
  '../../CartContext.js'
);

const cart = {
  uuid: 'cart-1',
  items: [{ cartItemId: 'i1', productSku: 'TEE', qty: 1 }],
  totalQty: 1,
  addItemApi: '/api/carts/cart-1/items',
  availableShippingMethods: [],
  error: null,
  errors: []
};
const methods = (name: string) => ({
  data: {
    myCart: {
      availableShippingMethods: [
        { code: name.toLowerCase(), name, providerCode: 'core' }
      ]
    }
  }
});

let state: ReturnType<typeof useCartState>;
let actions: ReturnType<typeof useCartDispatch>;
function Probe() {
  state = useCartState();
  actions = useCartDispatch();
  return null;
}

describe('shipping quotes for an address changed twice', () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(async () => {
    queries.length = 0;
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
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("the older address's quote, answered last, does not replace the newer one", async () => {
    let us!: Promise<void>;
    let ca!: Promise<void>;
    await act(async () => {
      us = actions.fetchAvailableShippingMethods({ country: 'US' });
      ca = actions.fetchAvailableShippingMethods({ country: 'CA' });
    });
    expect(queries.map((q) => q.variables.country)).toEqual(['US', 'CA']);

    // Canada answers first, the United States last
    await act(async () => {
      queries[1].result.resolve(methods('Canada Post'));
      await ca;
    });
    // The newer quote has landed; nothing is loading any more
    expect(state.loadingStates.fetchingShippingMethods).toBe(false);
    await act(async () => {
      queries[0].result.resolve(methods('US Ground'));
      await us;
    });

    expect(state.data.availableShippingMethods.map((m) => m.name)).toEqual([
      'Canada Post'
    ]);
    expect(state.loadingStates.fetchingShippingMethods).toBe(false);
  });

  it('while the newer quote is on the way, the older answer leaves it loading', async () => {
    let us!: Promise<void>;
    await act(async () => {
      us = actions.fetchAvailableShippingMethods({ country: 'US' });
      actions.fetchAvailableShippingMethods({ country: 'CA' });
    });
    await act(async () => {
      queries[0].result.resolve(methods('US Ground'));
      await us;
    });

    expect(state.data.availableShippingMethods).toEqual([]);
    expect(state.loadingStates.fetchingShippingMethods).toBe(true);
  });
});

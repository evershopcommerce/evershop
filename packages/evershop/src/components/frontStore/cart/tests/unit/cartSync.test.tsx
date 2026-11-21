import '../../../customer/address/tests/unit/domSetup.js';
import { jest, describe, it, expect, afterEach, beforeEach } from '@jest/globals';

/**
 * After a cart change (add an item, apply a coupon, ...) the cart is fetched
 * again, and `syncStatus.synced` says it has arrived. The re-fetch used
 * `useQuery`'s re-run function, which in urql 3 returns nothing: awaiting it
 * waited for nothing, so `synced` turned true, and `await addItem()`
 * resolved, before the new cart arrived. MiniCart opens on `synced` after
 * ADD_ITEM, so it showed the old contents (the empty cart, for a first
 * item). A failed fetch never reached the catch either. The re-fetch now
 * waits for the result.
 *
 * The real CartProvider, with a fake urql client whose query the test holds
 * open, and a fake fetch for the add-item API.
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

const queries: Array<{ context?: Record<string, unknown>; result: Deferred }> = [];
const fakeClient = {
  query: (_query: string, _variables: unknown, context?: Record<string, unknown>) => {
    const result = deferred();
    queries.push({ context, result });
    return { toPromise: () => result.promise };
  }
};
jest.unstable_mockModule('urql', () => ({
  useClient: () => fakeClient,
  // As urql 3: the re-run function returns nothing
  useQuery: () => [{ data: undefined, fetching: false, error: undefined }, () => undefined]
}));

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { CartProvider, useCartState, useCartDispatch } = await import(
  '../../CartContext.js'
);

const emptyCart = {
  uuid: 'cart-1',
  items: [],
  totalQty: 0,
  addItemApi: '/api/carts/cart-1/items',
  error: null
};
const cartWithItem = {
  ...emptyCart,
  totalQty: 1,
  items: [{ cartItemId: 'i1', productSku: 'TEE', qty: 1 }]
};

let state: ReturnType<typeof useCartState>;
let actions: ReturnType<typeof useCartDispatch>;
// What every render saw: MiniCart opens on a render with synced + ADD_ITEM
const renders: Array<{ synced: boolean; totalQty: number }> = [];
function Probe() {
  state = useCartState();
  actions = useCartDispatch();
  renders.push({ synced: state.syncStatus.synced, totalQty: state.data.totalQty });
  return null;
}

describe('cart sync after a change', () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;
  const realFetch = globalThis.fetch;

  beforeEach(async () => {
    queries.length = 0;
    renders.length = 0;
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({ data: {} })
    })) as unknown as typeof fetch;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <CartProvider
          cart={emptyCart as never}
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
    globalThis.fetch = realFetch;
  });

  /** Start addItem; let the add request finish; leave the cart fetch open */
  async function startAddItem() {
    let settled = false;
    let addItem!: Promise<void>;
    await act(async () => {
      addItem = actions.addItem({ sku: 'TEE', qty: 1 }).then(() => {
        settled = true;
      });
      await new Promise((r) => setTimeout(r, 0));
    });
    return { addItem, settled: () => settled };
  }

  it('synced turns true, and addItem resolves, only once the new cart has arrived', async () => {
    const run = await startAddItem();

    // The cart is being fetched: not synced yet, addItem still waiting
    expect(state.data.totalQty).toBe(0);
    expect(state.syncStatus).toMatchObject({ syncing: true, synced: false });
    expect(run.settled()).toBe(false);
    expect(queries).toHaveLength(1);
    expect(queries[0].context).toMatchObject({ requestPolicy: 'network-only' });

    await act(async () => {
      queries[0].result.resolve({ data: { myCart: cartWithItem } });
      await run.addItem;
    });

    // Synced comes with the new cart, in the same state: no render ever
    // showed "synced" with the old (empty) cart
    expect(renders.filter((r) => r.synced && r.totalQty === 0)).toEqual([]);
    expect(state.data.totalQty).toBe(1);
    expect(state.syncStatus).toEqual({
      syncing: false,
      synced: true,
      trigger: 'addItem'
    });
  });

  it('a failed fetch is reported and not synced; the item was still added', async () => {
    const run = await startAddItem();
    await act(async () => {
      queries[0].result.resolve({ error: { message: 'Network down' } });
      await run.addItem;
    });

    expect(run.settled()).toBe(true);
    expect(state.syncStatus).toEqual({
      syncing: false,
      synced: false,
      trigger: 'addItem'
    });
    expect(state.data.error).toBe('Network down');
  });
});

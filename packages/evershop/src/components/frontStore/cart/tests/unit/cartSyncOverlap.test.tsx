import '../../../customer/address/tests/unit/domSetup.js';
import { jest, describe, it, expect, afterEach, beforeEach } from '@jest/globals';

/**
 * Two cart changes close together, such as the quantities of two lines
 * (each line waits 500 ms after the last click, then sends its update): each
 * change fetches the cart again once its request is done. urql gives a query
 * the result of an identical one already in flight (dedupExchange), so when
 * the second update finished while the first one's fetch was still on the
 * wire, the second sync got that fetch's result: the cart as the server had
 * it before the second update. The page then showed the second line's old
 * price and the old totals until the next change or a reload. Each sync now
 * fetches after the one before it has finished.
 *
 * The real CartProvider with a real urql client (its default exchanges);
 * fetch is faked: an update answers at once, and the test holds each cart
 * query open and answers it with the cart the server had at that moment.
 */
const { createClient } = await import('urql');
const client = createClient({ url: '/api/graphql' });
jest.unstable_mockModule('urql', () => ({ useClient: () => client }));

const React = (await import('react')).default;
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { CartProvider, useCartState, useCartDispatch } = await import(
  '../../CartContext.js'
);

const line = (id: string, sku: string, qty: number, price: number) => ({
  cartItemId: id,
  uuid: `uuid-${id}`,
  productSku: sku,
  qty,
  lineTotal: { value: qty * price, text: `$${qty * price}.00` },
  removeApi: `/api/carts/cart-1/items/${id}`,
  updateQtyApi: `/api/carts/cart-1/items/${id}`
});
const cart = (cupQty: number, penQty: number) => ({
  uuid: 'cart-1',
  totalQty: cupQty + penQty,
  items: [line('i1', 'CUP', cupQty, 15), line('i2', 'PEN', penQty, 12)],
  addItemApi: '/api/carts/cart-1/items',
  error: null,
  errors: []
});

// Cart queries the page sent, each held open until the test answers it
const cartQueries: Array<(myCart: unknown) => void> = [];
const updates: string[] = [];

let state: ReturnType<typeof useCartState>;
let actions: ReturnType<typeof useCartDispatch>;
function Probe() {
  state = useCartState();
  actions = useCartDispatch();
  return null;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('cart sync after two changes close together', () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;
  const realFetch = globalThis.fetch;

  beforeEach(async () => {
    cartQueries.length = 0;
    updates.length = 0;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/api/graphql')) {
        return new Promise((resolve) => {
          cartQueries.push((myCart) =>
            resolve(
              new Response(JSON.stringify({ data: { myCart } }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              })
            )
          );
        });
      }
      updates.push(`${init?.method} ${url}`);
      return { ok: true, json: async () => ({ data: {} }) };
    }) as unknown as typeof fetch;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <CartProvider
          cart={cart(1, 1) as never}
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

  it("the second change's cart is fetched after it, not taken from the first change's fetch", async () => {
    let first!: Promise<void>;
    let second!: Promise<void>;

    // Line 1: its update is done, its cart query is on the wire
    await act(async () => {
      first = actions.updateItem('i1', { qty: 1, action: 'increase' });
      await tick();
    });
    expect(updates).toEqual(['PATCH /api/carts/cart-1/items/i1']);
    expect(cartQueries).toHaveLength(1);

    // Line 2: its update is done too, while that query is still open
    await act(async () => {
      second = actions.updateItem('i2', { qty: 1, action: 'increase' });
      await tick();
    });
    expect(updates).toHaveLength(2);

    // The server answers the first query with the cart it had then: line 1
    // changed, line 2 not yet
    await act(async () => {
      cartQueries[0](cart(2, 1));
      await tick();
      await tick();
    });

    // The second change gets a fetch of its own, answered with both changes
    expect(cartQueries).toHaveLength(2);
    await act(async () => {
      cartQueries[1](cart(2, 2));
      await Promise.all([first, second]);
    });

    expect(state.data.items.map((item) => [item.productSku, item.qty])).toEqual([
      ['CUP', 2],
      ['PEN', 2]
    ]);
    expect(state.data.totalQty).toBe(4);
    expect(state.syncStatus).toEqual({
      syncing: false,
      synced: true,
      trigger: 'updateItem'
    });
  });
});

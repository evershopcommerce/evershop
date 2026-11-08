import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  createFakeDb,
  createFakeQueryBuilder,
  type FakeDb
} from '../../../customer/tests/unit/fakeQueryBuilder.js';

/**
 * A cart recovery link (`/cart/recover/<token>`) gives a saved cart's products
 * back to whoever clicks its button, in any browser: `decideCartRecovery`
 * says what the link allows, `restoreCart` closes the saved cart (once) and
 * adds its items to the visitor's own cart. No database: carts are rows in a
 * fake query builder. The cart service is a fake whose `addItem` goes through
 * the REAL registry cache, as core's `addCartItem` does, with items whose
 * data sits in private fields like core's `Item`: a context object shared
 * between items made the cache hand back the first item for every later one
 * (found live, 2026-11-07).
 */

process.env.CART_RECOVERY_TOKEN_SECRET = 'unit-test-cart-recovery-secret-at-least-32-chars';

const SID = 'visitor-session';
const OTHER = 'laptop-session';
const SAVED = { id: 1, uuid: '6b6e1d10-8a3a-4f7a-9c4f-9b1c4a1a7777' };
const MINE = { id: 2, uuid: '11111111-2222-4333-8444-555555555555' };

let db: FakeDb;
let qb: ReturnType<typeof createFakeQueryBuilder>;
/** The cart service's view of each cart (by uuid): product ids added, coupon */
let carts: Record<string, { items: number[]; coupon: string | null; sid: string; customer_id: number | null }>;
let outOfStock: Set<number>;
let refusedCoupons: Set<string>;
let nextCartId: number;

/** Like core's Item: its data is in a private field, invisible to isEqual */
class FakeItem {
  #productId: number;

  constructor(productId: number) {
    this.#productId = productId;
  }

  get productId() {
    return this.#productId;
  }
}

jest.unstable_mockModule('@evershop/postgres-query-builder', () => ({
  select: (...args: unknown[]) => (qb.select as (...a: unknown[]) => unknown)(...args),
  update: (...args: unknown[]) => (qb.update as (...a: unknown[]) => unknown)(...args)
}));
jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: {},
  getConnection: async () => ({})
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  error: () => undefined,
  debug: () => undefined,
  info: () => undefined,
  warning: () => undefined
}));

const { getValue } = await import('../../../../lib/util/registry.js');

function fakeCart(uuid: string | null, init: { sid: string; customer_id: number | null }) {
  let id = uuid;
  // Like core's Cart: a new cart's uuid has no dashes, and the object keeps
  // that value after saveCart (only the row read back has the dashed form)
  const shownUuid = uuid ?? 'a1b2c3d4e5f64a7b8c9d0e1f2a3b4c5d';
  const state = () => carts[id!] ?? { items: [], coupon: null, ...init };
  return {
    isNew: uuid === null,
    getData: (key: string) => {
      if (key === 'uuid') return shownUuid;
      if (key === 'coupon') return state().coupon;
      return undefined;
    },
    // As core's addCartItem: the context gets the item's data, then the registry runs
    async addItem(productId: number, _qty: number, context: Record<string, unknown>) {
      if (outOfStock.has(productId)) throw new Error('This item is out of stock');
      context.itemData = { product_id: productId };
      const item = (await getValue('cartItemBeforeAdd', new FakeItem(productId), context)) as FakeItem;
      if (!id) {
        id = `new-cart-${nextCartId}`;
      }
      carts[id] = { ...state(), items: [...state().items, item.productId] };
    },
    // Like core's Cart: items the cart service refuses carry errors
    getItems: () =>
      state().items.map((productId) => ({
        hasError: () => outOfStock.has(productId),
        export: () => ({ product_id: productId })
      })),
    async setData(key: string, value: string) {
      if (key === 'coupon' && refusedCoupons.has(value)) {
        throw new Error(`Field resolvers returned different value - coupon, ${value}, null`);
      }
      carts[id!] = { ...state(), coupon: value };
    },
    save() {
      // A new cart gets its row (and a dashed uuid) when it is saved
      if (id && id.startsWith('new-cart-')) {
        const cartId = nextCartId++;
        const dashed = `99999999-0000-4000-8000-${String(cartId).padStart(12, '0')}`;
        carts[dashed] = carts[id];
        delete carts[id];
        db.tables.cart.push({ cart_id: cartId, uuid: dashed, sid: init.sid, customer_id: init.customer_id, status: 1, coupon: null });
        id = dashed;
        return cartId;
      }
      return db.tables.cart.find((c) => c.uuid === id)!.cart_id;
    }
  };
}

jest.unstable_mockModule('../../services/cart/Cart.js', () => ({
  getCart: async (uuid: string) => {
    const row = db.tables.cart.find((c) => c.uuid === uuid && c.status === 1);
    if (!row) throw new Error('Cart not found');
    return fakeCart(uuid, { sid: row.sid as string, customer_id: row.customer_id as number | null });
  },
  Cart: class {},
  Item: class {}
}));
jest.unstable_mockModule('../../services/createNewCart.js', () => ({
  createNewCart: async (sid: string, customer: { customer_id?: number }) =>
    fakeCart(null, { sid, customer_id: customer.customer_id ?? null })
}));
jest.unstable_mockModule('../../services/saveCart.js', () => ({
  saveCart: async (cart: { save: () => number }) => cart.save()
}));

const { decideCartRecovery, restoreCart, savedCartItems } = await import('../../services/cartRecovery.js');
const { signCartRecoveryToken } = await import('../../services/cartRecoveryToken.js');
const { default: resolvers } = await import(
  '../../graphql/types/CartRecovery/CartRecovery.resolvers.js'
);

const token = signCartRecoveryToken(SAVED.id);
const savedRow = (extra: Record<string, unknown> = {}) => ({
  cart_id: SAVED.id, uuid: SAVED.uuid, sid: OTHER, customer_id: null, status: 1, coupon: null, ...extra
});
const mineRow = (extra: Record<string, unknown> = {}) => ({
  cart_id: MINE.id, uuid: MINE.uuid, sid: SID, customer_id: null, status: 1, coupon: null, ...extra
});
const row = (id: number) => db.tables.cart.find((r) => r.cart_id === id)!;
const items = (cartId: number, productIds: number[]) =>
  productIds.map((productId, i) => ({ cart_item_id: cartId * 100 + i, cart_id: cartId, product_id: productId, product_sku: `SKU-${productId}`, qty: 1 }));

function seed(
  cartRows: Array<Record<string, unknown>>,
  cartItems: Array<Record<string, unknown>> = [],
  orders: Array<Record<string, unknown>> = []
) {
  db = createFakeDb({ cart: cartRows, cart_item: cartItems, order: orders });
  qb = createFakeQueryBuilder(db);
  carts = {};
  for (const c of cartRows) {
    carts[c.uuid as string] = {
      items: cartItems.filter((i) => i.cart_id === c.cart_id).map((i) => i.product_id as number),
      coupon: (c.coupon as string) ?? null,
      sid: c.sid as string,
      customer_id: (c.customer_id as number) ?? null
    };
  }
}

beforeEach(() => {
  outOfStock = new Set();
  refusedCoupons = new Set();
  nextCartId = 50;
});

describe('decideCartRecovery', () => {
  it('no token, a bad token, a token for no cart, or an ordered cart: not valid', async () => {
    seed([savedRow()]);
    expect(await decideCartRecovery(undefined, { sessionId: SID })).toEqual({ action: 'invalid' });
    expect(await decideCartRecovery('not.a.token', { sessionId: SID })).toEqual({ action: 'invalid' });
    expect(await decideCartRecovery(signCartRecoveryToken(999), { sessionId: SID })).toEqual({ action: 'invalid' });
    seed([savedRow({ status: false })], [], [{ order_id: 3, cart_id: SAVED.id }]);
    expect(await decideCartRecovery(token, { sessionId: SID })).toEqual({ action: 'invalid' });
  });

  it('a link used already (its cart closed by a restore, no order from it): restored', async () => {
    seed([savedRow({ status: false, sid: null })], [], [{ order_id: 3, cart_id: 77 }]);
    expect(await decideCartRecovery(token, { sessionId: SID })).toEqual({ action: 'restored' });
  });

  it('a guest cart: ready for any visitor, wherever it is in use', async () => {
    seed([savedRow()]);
    expect(await decideCartRecovery(token, { sessionId: SID })).toMatchObject({ action: 'ready', cart: { cart_id: SAVED.id } });
    expect(await decideCartRecovery(token, { sessionId: SID, customer: { customer_id: 7 } })).toMatchObject({ action: 'ready' });
  });

  it('a cart given back after an abandoned payment (open again, unlinked, its order canceled): ready, and a restore works once', async () => {
    seed([savedRow({ sid: null }), mineRow()], items(SAVED.id, [5]), [
      { order_id: 3, cart_id: SAVED.id, status: 'canceled', placed_at: null }
    ]);
    expect(await decideCartRecovery(token, { sessionId: SID })).toMatchObject({ action: 'ready' });
    expect(await restoreCart(savedRow({ sid: null }), { sessionId: SID })).toEqual({ added: 1, skipped: 0 });
    expect(carts[MINE.uuid].items).toEqual([5]);
    // The same link in the next reminder email: "already restored", not "no longer valid"
    expect(await decideCartRecovery(token, { sessionId: SID })).toEqual({ action: 'restored' });
  });

  it("a customer's cart: a guest must sign in, the owner may restore it, another customer may not", async () => {
    seed([savedRow({ customer_id: 18 })]);
    expect(await decideCartRecovery(token, { sessionId: SID })).toEqual({ action: 'login' });
    expect(await decideCartRecovery(token, { sessionId: SID, customer: { customer_id: 18 } })).toMatchObject({ action: 'ready' });
    expect(await decideCartRecovery(token, { sessionId: SID, customer: { customer_id: 19 } })).toEqual({ action: 'invalid' });
  });
});

describe('restoreCart', () => {
  it("adds every item to the visitor's cart (each through the cart service), closes the saved cart, keeps the visitor's", async () => {
    seed([savedRow(), mineRow()], [...items(SAVED.id, [5, 7, 9]), ...items(MINE.id, [3])]);
    expect(await restoreCart(savedRow(), { sessionId: SID })).toEqual({ added: 3, skipped: 0 });
    expect(carts[MINE.uuid].items).toEqual([3, 5, 7, 9]);
    expect(row(SAVED.id)).toMatchObject({ status: false, sid: null });
    expect(row(MINE.id)).toMatchObject({ status: 1, sid: SID });
  });

  it('works once: a second restore (a second click) finds the saved cart closed and adds nothing', async () => {
    seed([savedRow(), mineRow()], items(SAVED.id, [5]));
    await restoreCart(savedRow(), { sessionId: SID });
    expect(await restoreCart(savedRow(), { sessionId: SID })).toEqual({ added: 0, skipped: 0 });
    expect(carts[MINE.uuid].items).toEqual([5]);
    expect(await decideCartRecovery(token, { sessionId: SID })).toEqual({ action: 'restored' });
  });

  it('a visitor without a cart gets a new one, read back by its id for the next items', async () => {
    seed([savedRow()], items(SAVED.id, [5, 7]));
    expect(await restoreCart(savedRow(), { sessionId: SID, customer: { customer_id: 4 } })).toEqual({ added: 2, skipped: 0 });
    const created = db.tables.cart.find((c) => c.cart_id === 50)!;
    expect(created).toMatchObject({ sid: SID, customer_id: 4, status: 1 });
    expect(carts[created.uuid as string].items).toEqual([5, 7]);
  });

  it('an item that cannot be added is skipped, without an error; the others are added', async () => {
    seed([savedRow(), mineRow()], items(SAVED.id, [5, 7, 9]));
    outOfStock.add(7);
    expect(await restoreCart(savedRow(), { sessionId: SID })).toEqual({ added: 2, skipped: 1 });
    expect(carts[MINE.uuid].items).toEqual([5, 9]);
  });

  it('a saved cart whose items are all gone (deleted products): nothing added, no error', async () => {
    seed([savedRow(), mineRow()], []);
    expect(await restoreCart(savedRow(), { sessionId: SID })).toEqual({ added: 0, skipped: 0 });
    expect(row(SAVED.id).status).toBe(false);
  });

  it("the saved cart's coupon goes to a visitor's cart without one; a cart with a coupon keeps it; a refused coupon is left off", async () => {
    seed([savedRow({ coupon: 'TEN' }), mineRow()], items(SAVED.id, [5]));
    await restoreCart(savedRow(), { sessionId: SID });
    expect(carts[MINE.uuid].coupon).toBe('TEN');

    seed([savedRow({ coupon: 'TEN' }), mineRow({ coupon: 'FIVE' })], items(SAVED.id, [5]));
    await restoreCart(savedRow(), { sessionId: SID });
    expect(carts[MINE.uuid].coupon).toBe('FIVE');

    seed([savedRow({ coupon: 'OLD' }), mineRow()], items(SAVED.id, [5]));
    refusedCoupons.add('OLD');
    await expect(restoreCart(savedRow(), { sessionId: SID })).resolves.toEqual({ added: 1, skipped: 0 });
    expect(carts[MINE.uuid].coupon).toBeNull();
  });

  it('the saved cart is already this browser\'s cart: nothing to do, it stays open', async () => {
    seed([savedRow({ sid: SID })], items(SAVED.id, [5]));
    expect(await restoreCart(savedRow({ sid: SID }), { sessionId: SID })).toEqual({ added: 0, skipped: 0 });
    expect(row(SAVED.id)).toMatchObject({ status: 1, sid: SID });
  });

  it("another customer's cart on the session is unlinked (getMyCart), never used: the visitor gets a new cart", async () => {
    seed([savedRow(), mineRow({ customer_id: 30 })], items(SAVED.id, [5]));
    await restoreCart(savedRow(), { sessionId: SID, customer: { customer_id: 18 } });
    expect(row(MINE.id)).toMatchObject({ sid: null, status: 1, customer_id: 30 });
    expect(carts[MINE.uuid].items).toEqual([]);
    expect(db.tables.cart.find((c) => c.cart_id === 50)).toMatchObject({ sid: SID, customer_id: 18 });
  });
});

describe('savedCartItems (the list on the page)', () => {
  it('lists the items the cart service accepts; refused ones are left out silently', async () => {
    seed([savedRow()], items(SAVED.id, [5, 7, 9]));
    outOfStock.add(7);
    expect(await savedCartItems(savedRow())).toEqual([{ product_id: 5 }, { product_id: 9 }]);
  });

  it('a cart that cannot be built (closed meanwhile): an empty list, no error', async () => {
    seed([savedRow({ status: false })], items(SAVED.id, [5]));
    expect(await savedCartItems(savedRow())).toEqual([]);
  });
});

describe('Query.cartRecoveryStatus / cartRecoveryItems', () => {
  it("are the page middleware's values: null / an empty list elsewhere", () => {
    const status = resolvers.Query.cartRecoveryStatus;
    expect(status(null, null, { cartRecoveryStatus: 'ready' })).toBe('ready');
    expect(status(null, null, {})).toBeNull();
    const list = resolvers.Query.cartRecoveryItems;
    expect(list(null, null, { cartRecoveryItems: [{ product_name: 'Cup', line_total: 15 }] })).toEqual([{ productName: 'Cup', lineTotal: 15 }]);
    expect(list(null, null, {})).toEqual([]);
  });
});

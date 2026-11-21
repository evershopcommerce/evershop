import { jest, describe, it, expect, beforeEach } from '@jest/globals';

/**
 * The public `/carts/:cart_id/*` and `/cart/:cart_id/*` routes answered 500
 * for a cart that does not exist. Each had an `if (!cart)` branch, but
 * `getCartByUUID` throws "Cart not found" instead of returning null, so the
 * branch was dead and the throw reached the 500 catch. A malformed id (not a
 * UUID) failed even earlier, in Postgres ("invalid input syntax for type
 * uuid"). They now answer 404, and a malformed id never reaches the database.
 *
 * The real handlers and the real `getCart`, over a stand-in pool.
 */
const queries: string[] = [];
let poolMode: 'empty' | 'inactive' | 'down' = 'empty';
const fakePool = {
  async query(sql: string | { text: string }) {
    queries.push(typeof sql === 'string' ? sql : sql.text);
    if (poolMode === 'down') {
      // As the pg driver throws it: the query builder reads `code`
      throw Object.assign(new Error('connection refused'), {
        code: 'ECONNREFUSED'
      });
    }
    return {
      rows:
        poolMode === 'inactive'
          ? [{ cart_id: 1, uuid: VALID_UUID, status: false }]
          : []
    };
  },
  release() {}
};
const VALID_UUID = '0b9c2f3e-6f4e-4a8e-9a55-1f0f8a6c2d11';

jest.unstable_mockModule('../../../../lib/postgres/connection.js', () => ({
  pool: fakePool,
  getConnection: async () => fakePool
}));
jest.unstable_mockModule('../../../../lib/locale/translate/translate.js', () => ({
  translate: (text: string) => text
}));
jest.unstable_mockModule('../../../../lib/log/logger.js', () => ({
  error: () => undefined,
  warning: () => undefined,
  info: () => undefined,
  debug: () => undefined,
  success: () => undefined
}));

// [route, handler module, extra params, body]
const ROUTES: Array<[string, string, Record<string, string>, Record<string, unknown>]> = [
  ['POST /carts/:cart_id/addresses', '../../api/addCartAddress/saveAddress.js', {}, { type: 'shipping', address: {} }],
  ['POST /carts/:cart_id/contacts', '../../api/addCartContactInfo/saveContactInfo.js', {}, { email: 'jane@example.com' }],
  ['POST /carts/:cart_id/paymentMethods', '../../api/addCartPaymentMethod/savePaymentMethod.js', {}, { method_code: 'cod' }],
  ['POST /carts/:cart_id/shippingMethods', '../../api/addCartShippingMethod/saveShippingMethod.js', {}, { method_code: 'flat', provider_code: 'core' }],
  ['POST /carts/:cart_id/shippingNotes', '../../api/addShippingNote/saveShippingNote.js', {}, { note: 'Leave at the door' }],
  ['POST /carts/:cart_id/checkout', '../../api/cartCheckout/checkout.js', {}, { customer: { email: 'jane@example.com' } }],
  ['POST /cart/:cart_id/items', '../../api/addCartItem/addItemToCart.js', {}, { sku: 'TEE', qty: 1 }],
  ['PATCH /cart/:cart_id/items/:item_id', '../../api/updateCartItemQty/[bodyParser]updateQty.js', { item_id: 'item-1' }, { action: 'increase', qty: 1 }],
  ['DELETE /cart/:cart_id/items/:item_id', '../../api/removeCartItem/removeItem.js', { item_id: 'item-1' }, {}],
  ['POST /carts/:cart_id/coupons', '../../../promotion/api/couponApply/[validateCouponCode]applyCoupon.js', {}, { coupon: 'SPRING' }],
  ['DELETE /carts/:cart_id/coupons/:coupon', '../../../promotion/api/couponRemove/removeCoupon.js', { coupon: 'SPRING' }, {}]
];

async function call(
  handlerPath: string,
  cartId: string,
  params: Record<string, string>,
  body: Record<string, unknown>
) {
  const handler = (await import(handlerPath)).default;
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
    params: { cart_id: cartId, ...params },
    body,
    currentRoute: { id: 'route' },
    getCurrentCustomer: () => null,
    locals: {}
  };
  await handler(request, response, () => undefined);
  return response;
}

beforeEach(() => {
  queries.length = 0;
  poolMode = 'empty';
});

describe('the cart routes with a cart that does not exist', () => {
  it.each(ROUTES)('%s: an unknown id is 404', async (_route, handler, params, body) => {
    const response = await call(handler, VALID_UUID, params, body);
    expect(response.statusCode).toBe(404);
    expect(response.jsonBody.error.status).toBe(404);
  });

  it.each(ROUTES)('%s: a malformed id is 404, without a query', async (_route, handler, params, body) => {
    const response = await call(handler, 'not-a-uuid', params, body);
    expect(response.statusCode).toBe(404);
    expect(queries).toEqual([]);
  });

  // The contacts route checks `status` in its UPDATE, which this stand-in
  // pool does not run: saveContactInfo.test.ts covers it on Postgres
  it('a cart that is no longer active (its order was placed) is 404', async () => {
    poolMode = 'inactive';
    const response = await call(ROUTES[0][1], VALID_UUID, {}, ROUTES[0][3]);
    expect(response.statusCode).toBe(404);
  });

  it('a database failure is still a 500, not a 404', async () => {
    poolMode = 'down';
    const response = await call(ROUTES[1][1], VALID_UUID, {}, ROUTES[1][3]);
    expect(response.statusCode).toBe(500);
    expect(response.jsonBody.error.message).toBe('connection refused');
  });
});

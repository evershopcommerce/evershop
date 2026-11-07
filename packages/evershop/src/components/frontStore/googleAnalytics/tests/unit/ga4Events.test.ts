import { describe, it, expect } from '@jest/globals';
import type { AnyCommerceEvent, CommerceItem } from '@evershop/evershop/types/commerceEvents';
import { toGa4Event, toGa4Item } from '../../ga4Events.js';

/**
 * The commerce events as GA4's recommended ecommerce events (gtag.js):
 * names, the event parameters and the items. An item's `price` is its unit
 * price after the discount, `discount` the discount per unit, and `coupon`
 * the coupon that gave it. Events GA4 has no name for send nothing.
 */
const item = (extra: Partial<CommerceItem> = {}): CommerceItem => ({
  productId: 12,
  variantGroupId: 3,
  sku: 'TEE-RED-M',
  name: 'Tee',
  variant: 'Red / M',
  qty: 2,
  price: 10,
  priceInclTax: 11,
  discount: 1,
  url: 'http://localhost/tee',
  ...extra
});
const cart = {
  cartId: 'cart-1',
  currency: 'USD',
  value: 18,
  coupon: 'TEN',
  totalQty: 2,
  items: [item()]
};
const event = (name: string, data: unknown) =>
  ({ id: 'e-1', name, version: 1, timestamp: '', seq: 1, replayed: false, context: {}, data }) as unknown as AnyCommerceEvent;

const ga4Item = {
  item_id: 'TEE-RED-M',
  item_name: 'Tee',
  item_variant: 'Red / M',
  price: 9,
  discount: 1,
  quantity: 2
};
// The same item in an event whose cart or order has the coupon TEN
const tenItem = { ...ga4Item, coupon: 'TEN' };

describe('GA4 items', () => {
  it('the sku as item_id, the price after the discount, the discount per unit', () => {
    expect(toGa4Item(item(), 'USD')).toEqual(ga4Item);
  });

  it('no discount and no variant: neither is sent', () => {
    expect(toGa4Item(item({ discount: 0, variant: undefined }), 'USD')).toEqual({
      item_id: 'TEE-RED-M',
      item_name: 'Tee',
      price: 10,
      quantity: 2
    });
  });

  it('the coupon only on an item that has a discount', () => {
    expect(toGa4Item(item(), 'USD', 'TEN')).toEqual(tenItem);
    expect(toGa4Item(item({ discount: 0 }), 'USD', 'TEN')).not.toHaveProperty('coupon');
    expect(toGa4Item(item(), 'USD')).not.toHaveProperty('coupon');
  });

  it('the price is rounded to the currency (a 10 % coupon on 18.18 is 1.818 per unit)', () => {
    expect(toGa4Item(item({ price: 18.18, discount: 1.82 }), 'USD').price).toBe(16.36);
    expect(toGa4Item(item({ price: 1200, discount: 120.4 }), 'JPY').price).toBe(1080);
  });

  it('categories: item_category, then item_category2 … 5', () => {
    const categories = ['Men', 'Tops', 'Tees', 'Cotton', 'Basics', 'Sale'];
    expect(toGa4Item(item({ categories }), 'USD')).toMatchObject({
      item_category: 'Men',
      item_category2: 'Tops',
      item_category3: 'Tees',
      item_category4: 'Cotton',
      item_category5: 'Basics'
    });
    expect(toGa4Item(item({ categories }), 'USD')).not.toHaveProperty('item_category6');
  });
});

describe('GA4 events', () => {
  it('product_viewed → view_item', () => {
    expect(toGa4Event(event('product_viewed', { currency: 'USD', value: 18, taxIncluded: false, items: [item()] }))).toEqual({
      name: 'view_item',
      params: { currency: 'USD', value: 18, items: [ga4Item] }
    });
  });

  it('a line change → add_to_cart / remove_from_cart, with the changed units', () => {
    // The cart's coupon goes on the discounted item only: add_to_cart has no event coupon
    const change = { currency: 'USD', value: 9, items: [item({ qty: 1 })], lineQty: 3, previousLineQty: 2, cart };
    expect(toGa4Event(event('product_added_to_cart', change))).toEqual({
      name: 'add_to_cart',
      params: { currency: 'USD', value: 9, items: [{ ...tenItem, quantity: 1 }] }
    });
    expect(toGa4Event(event('product_removed_from_cart', change))).toEqual({
      name: 'remove_from_cart',
      params: { currency: 'USD', value: 9, items: [{ ...tenItem, quantity: 1 }] }
    });
    const noCoupon = { ...change, cart: { ...cart, coupon: undefined } };
    expect(toGa4Event(event('product_added_to_cart', noCoupon))?.params.items).toEqual([{ ...ga4Item, quantity: 1 }]);
  });

  it('a coupon for some products: only the items it discounted carry it', () => {
    const mug = item({ sku: 'MUG', name: 'Mug', variant: undefined, qty: 1, price: 8, discount: 0 });
    const data = { ...cart, value: 26, totalQty: 3, items: [item(), mug] };
    expect(toGa4Event(event('checkout_started', data))?.params).toEqual({
      currency: 'USD',
      value: 26,
      coupon: 'TEN',
      items: [tenItem, { item_id: 'MUG', item_name: 'Mug', price: 8, quantity: 1 }]
    });
  });

  it('cart_viewed → view_cart, checkout_started → begin_checkout, with the coupon', () => {
    const params = { currency: 'USD', value: 18, coupon: 'TEN', items: [tenItem] };
    expect(toGa4Event(event('cart_viewed', cart))).toEqual({ name: 'view_cart', params });
    expect(toGa4Event(event('checkout_started', cart))).toEqual({ name: 'begin_checkout', params });
  });

  it('no coupon: no coupon parameter', () => {
    expect(toGa4Event(event('checkout_started', { ...cart, coupon: undefined }))?.params).not.toHaveProperty('coupon');
  });

  it('a shipping method → add_shipping_info, with its name as shipping_tier', () => {
    const data = { ...cart, shippingMethod: { code: '9f0c…', name: 'Flat Rate' } };
    expect(toGa4Event(event('checkout_shipping_info_submitted', data))).toEqual({
      name: 'add_shipping_info',
      params: { currency: 'USD', value: 18, coupon: 'TEN', items: [tenItem], shipping_tier: 'Flat Rate' }
    });
  });

  it('a payment method → add_payment_info, with its name as payment_type', () => {
    const data = { ...cart, paymentMethod: { code: 'cod', name: 'Cash On Delivery' } };
    expect(toGa4Event(event('payment_info_submitted', data))?.params).toMatchObject({
      payment_type: 'Cash On Delivery',
      value: 18
    });
    expect(toGa4Event(event('payment_info_submitted', data))?.name).toBe('add_payment_info');
  });

  it('checkout_completed → purchase: the order number as transaction_id, tax and shipping', () => {
    const order = {
      orderId: '6f1c2b4e-0000-4000-8000-000000000001',
      orderNumber: '10001',
      placed: false,
      paymentStatus: 'pending',
      currency: 'USD',
      value: 18,
      tax: 1.8,
      shipping: 5,
      discount: 2,
      total: 24.8,
      coupon: 'TEN',
      items: [item()]
    };
    expect(toGa4Event(event('checkout_completed', order))).toEqual({
      name: 'purchase',
      params: {
        transaction_id: '10001',
        currency: 'USD',
        value: 18,
        coupon: 'TEN',
        items: [tenItem],
        tax: 1.8,
        shipping: 5
      }
    });
    // Never an empty transaction_id: GA4 would merge every such purchase into one
    expect(toGa4Event(event('checkout_completed', { ...order, orderNumber: '' }))?.params.transaction_id).toBe(order.orderId);
  });

  it('events GA4 has no name for: nothing', () => {
    expect(toGa4Event(event('checkout_contact_info_submitted', { ...cart, loggedIn: false }))).toBeNull();
    expect(toGa4Event(event('coupon_applied', { coupon: 'TEN', cart }))).toBeNull();
    expect(toGa4Event(event('coupon_removed', { coupon: 'TEN', cart }))).toBeNull();
    expect(toGa4Event(event('myext:popup_shown', { popupId: 'x' }))).toBeNull();
    expect(toGa4Event(event('myext:nothing', null))).toBeNull();
  });

  it('no items (an empty cart page, /checkout redirecting there): nothing, except a purchase', () => {
    const empty = { ...cart, cartId: '', value: 0, coupon: undefined, totalQty: 0, items: [] };
    expect(toGa4Event(event('cart_viewed', empty))).toBeNull();
    expect(toGa4Event(event('checkout_started', empty))).toBeNull();
    expect(toGa4Event(event('checkout_shipping_info_submitted', { ...empty, shippingMethod: { code: 'x', name: 'Flat' } }))).toBeNull();
    expect(toGa4Event(event('payment_info_submitted', { ...empty, paymentMethod: { code: 'cod', name: 'Cash' } }))).toBeNull();
    // A purchase's revenue counts, whatever its items
    const order = { orderId: 'o-1', orderNumber: '10001', currency: 'USD', value: 5, tax: 0, shipping: 0, items: [] };
    expect(toGa4Event(event('checkout_completed', order))).toMatchObject({ name: 'purchase', params: { value: 5, items: [] } });
  });

  it("a cart or order line's category reaches every event, not only view_item", () => {
    const shirt = item({ categories: ['Shirts'] });
    const added = { currency: 'USD', value: 18, items: [shirt], lineQty: 2, previousLineQty: 0, cart };
    expect(toGa4Event(event('product_added_to_cart', added))?.params.items).toEqual([{ ...tenItem, item_category: 'Shirts' }]);
    const order = { orderId: 'o-1', orderNumber: '10001', currency: 'USD', value: 18, tax: 0, shipping: 0, items: [shirt] };
    expect(toGa4Event(event('checkout_completed', order))?.params.items).toEqual([{ ...ga4Item, item_category: 'Shirts' }]);
  });
});

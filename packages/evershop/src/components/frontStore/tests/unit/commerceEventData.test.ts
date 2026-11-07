import '../../customer/address/tests/unit/domSetup.js';
import { describe, it, expect } from '@jest/globals';

/**
 * Commerce event data from cart and order lines
 * (`components/frontStore/commerceEventData.ts`). Amounts follow GA4:
 * without tax; `discount` is per unit; `value` is Σ (price − discount) × qty.
 */
const {
  toCommerceItem,
  toCommerceCart,
  toLineChange,
  lineValue,
  absoluteUrl,
  roundAmount,
  currencyDigits
} = await import('../../commerceEventData.js');

const money = (value: number) => ({ value, text: String(value) });

/** 3 × 10.00 without tax (11.00 with), a 3.00 coupon share on the line */
const line = {
  uuid: 'line-1',
  productId: '12',
  variantGroupId: 4,
  productSku: 'TEE-RED-M',
  productName: 'Tee',
  qty: 3,
  thumbnail: '/assets/catalog/tee.jpg',
  productUrl: '/tee-red-m',
  finalPrice: money(10),
  finalPriceInclTax: money(11),
  lineTotal: money(30),
  lineTotalWithDiscount: money(27),
  variantOptions: [{ optionText: 'Red' }, { optionText: 'M' }]
};

const other = {
  ...line,
  uuid: 'line-2',
  productId: '13',
  variantGroupId: null,
  productSku: 'MUG',
  productName: 'Mug',
  qty: 1,
  finalPrice: money(5),
  finalPriceInclTax: money(5.5),
  lineTotal: money(5),
  lineTotalWithDiscount: money(5),
  variantOptions: []
};

const cart = {
  uuid: 'cart-1',
  currency: 'EUR',
  coupon: 'TEN',
  totalQty: 4,
  items: [line, other]
};

describe('commerce event data', () => {
  it('a line becomes an item: unit price without tax, discount per unit, absolute URLs', () => {
    expect(toCommerceItem(line)).toEqual({
      productId: 12,
      variantGroupId: 4,
      sku: 'TEE-RED-M',
      name: 'Tee',
      variant: 'Red / M',
      qty: 3,
      price: 10,
      priceInclTax: 11,
      discount: 1,
      url: 'http://localhost/tee-red-m',
      image: 'http://localhost/assets/catalog/tee.jpg'
    });
    expect(toCommerceItem(other)).toMatchObject({
      variantGroupId: null,
      variant: undefined,
      discount: 0
    });
  });

  it("a line's category (cart and order lines ask for it) is the item's categories; none without one", () => {
    const shirts = { ...line, category: { name: 'Shirts' } };
    expect(toCommerceItem(shirts).categories).toEqual(['Shirts']);
    expect(toCommerceCart({ ...cart, items: [shirts] }).items[0].categories).toEqual(['Shirts']);
    expect(toLineChange(undefined, shirts, { ...cart, items: [shirts] })?.data.items[0].categories).toEqual(['Shirts']);
    for (const category of [undefined, null, { name: null }, { name: '' }]) {
      expect(toCommerceItem({ ...line, category }).categories).toBeUndefined();
    }
  });

  it('an item can carry another qty than its line (a quantity change)', () => {
    expect(toCommerceItem(line, 1)).toMatchObject({ qty: 1, discount: 1 });
    expect(lineValue(line, 1)).toBe(9);
    expect(lineValue(line)).toBe(27);
  });

  it('a cart: its value is the lines after discount, without tax', () => {
    expect(toCommerceCart(cart)).toEqual({
      cartId: 'cart-1',
      currency: 'EUR',
      value: 32,
      coupon: 'TEN',
      totalQty: 4,
      items: [toCommerceItem(line), toCommerceItem(other)]
    });
    expect(toCommerceCart({ ...cart, coupon: null }).coupon).toBeUndefined();
  });

  it('a quantity change is "added" or "removed" with the difference', () => {
    // A new line
    expect(toLineChange(undefined, line, cart)).toEqual({
      name: 'product_added_to_cart',
      data: {
        currency: 'EUR',
        value: 27,
        items: [toCommerceItem(line, 3)],
        lineQty: 3,
        previousLineQty: 0,
        cart: toCommerceCart(cart)
      }
    });
    // 1 → 3: added, qty 2
    expect(toLineChange({ ...line, qty: 1 }, line, cart)).toMatchObject({
      name: 'product_added_to_cart',
      data: { value: 18, items: [{ qty: 2 }], lineQty: 3, previousLineQty: 1 }
    });
    // 3 → 1: removed, qty 2, valued as the line was
    expect(
      toLineChange(line, { ...line, qty: 1, lineTotal: money(10), lineTotalWithDiscount: money(9) }, cart)
    ).toMatchObject({
      name: 'product_removed_from_cart',
      data: { value: 18, items: [{ qty: 2 }], lineQty: 1, previousLineQty: 3 }
    });
    // The line removed
    expect(toLineChange(line, undefined, cart)).toMatchObject({
      name: 'product_removed_from_cart',
      data: { value: 27, items: [{ qty: 3 }], lineQty: 0, previousLineQty: 3 }
    });
    // No change, or no line at all
    expect(toLineChange(line, line, cart)).toBeNull();
    expect(toLineChange(undefined, undefined, cart)).toBeNull();
  });

  it("rounds amounts to the currency's minor unit", () => {
    expect(currencyDigits('USD')).toBe(2);
    expect(currencyDigits('JPY')).toBe(0);
    expect(currencyDigits('KWD')).toBe(3);
    expect(currencyDigits('not a currency')).toBe(2);
    expect(currencyDigits(undefined)).toBe(2);
    expect(roundAmount(46.2273, 'USD')).toBe(46.23);
    expect(roundAmount(1499.6, 'JPY')).toBe(1500);

    // Core keeps a discounted line at 4 decimals: 2 × 18.18 less 10 %
    const taxed = {
      ...line,
      qty: 2,
      finalPrice: money(18.18),
      lineTotal: money(36.36),
      lineTotalWithDiscount: money(32.7273)
    };
    const usd = { ...cart, currency: 'USD', items: [taxed] };
    expect(toCommerceCart(usd)).toMatchObject({
      value: 32.73,
      items: [{ price: 18.18, discount: 1.82 }]
    });
    expect(toLineChange(undefined, taxed, usd)?.data.value).toBe(32.73);
  });

  it('absoluteUrl keeps absolute URLs and resolves paths against the store', () => {
    expect(absoluteUrl('https://cdn.example.com/a.jpg')).toBe(
      'https://cdn.example.com/a.jpg'
    );
    expect(absoluteUrl('/a.jpg')).toBe('http://localhost/a.jpg');
    expect(absoluteUrl(null)).toBeUndefined();
    expect(absoluteUrl('')).toBeUndefined();
  });
});

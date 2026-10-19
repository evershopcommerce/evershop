import { describe, expect, it } from '@jest/globals';
import { priceHistoricalOrder } from '../../services/importOrder.js';
import type { HistoricalOrderItem } from '../../services/importOrder.js';

/**
 * The amounts of a historical order, as one function of its lines and its
 * shipping: no query, no clock, no configuration. The order is a record of what
 * was charged, so every figure is worked out here and none is read from the
 * store's present prices, taxes or shipping rules.
 */
const item = (
  over: Partial<HistoricalOrderItem> = {}
): HistoricalOrderItem => ({
  sku: 'SKU-1',
  name: 'A product',
  qty: 1,
  price: 100,
  ...over
});

describe('priceHistoricalOrder', () => {
  it('works out a line with tax from the rate', () => {
    const { lines, order } = priceHistoricalOrder([
      item({ qty: 2, taxPercent: 10 })
    ]);
    expect(lines[0]).toMatchObject({
      taxPercent: 10,
      unitInclTax: 110,
      lineTotal: 200,
      lineTotalInclTax: 220,
      withDiscount: 200,
      withDiscountInclTax: 220,
      taxAmount: 20,
      taxBeforeDiscount: 20
    });
    expect(order).toMatchObject({
      sub_total: 200,
      sub_total_incl_tax: 220,
      sub_total_with_discount: 200,
      sub_total_with_discount_incl_tax: 220,
      tax_amount: 20,
      discount_amount: 0,
      grand_total: 220,
      total_qty: 2
    });
  });

  it('takes the discount off before the tax, and keeps the tax before the discount too', () => {
    const { lines, order } = priceHistoricalOrder([
      item({ taxPercent: 10, discountAmount: 20 })
    ]);
    expect(lines[0]).toMatchObject({
      withDiscount: 80,
      taxAmount: 8,
      taxBeforeDiscount: 10,
      withDiscountInclTax: 88
    });
    expect(order).toMatchObject({
      discount_amount: 20,
      sub_total: 100,
      sub_total_with_discount: 80,
      tax_amount: 8,
      tax_amount_before_discount: 10,
      grand_total: 88
    });
  });

  it('finds the rate between the two prices when only the price with tax is given', () => {
    const { lines } = priceHistoricalOrder([item({ priceInclTax: 120 })]);
    expect(lines[0]).toMatchObject({
      taxPercent: 20,
      unitInclTax: 120,
      taxAmount: 20,
      withDiscountInclTax: 120
    });
  });

  it('does not divide by a price of zero', () => {
    const { lines, order } = priceHistoricalOrder([
      item({ price: 0, priceInclTax: 0 })
    ]);
    expect(lines[0].taxPercent).toBe(0);
    expect(order.grand_total).toBe(0);
  });

  it('adds the shipping to the grand total and its tax to the total tax', () => {
    const { order } = priceHistoricalOrder([item({ taxPercent: 10 })], {
      feeExclTax: 10,
      feeInclTax: 12
    });
    expect(order).toMatchObject({
      shipping_fee_excl_tax: 10,
      shipping_fee_incl_tax: 12,
      shipping_tax_amount: 2,
      tax_amount: 10,
      total_tax_amount: 12,
      grand_total: 122
    });
  });

  it('takes a shipping tax that is given instead of working it out', () => {
    const { order } = priceHistoricalOrder([item()], {
      feeExclTax: 10,
      feeInclTax: 12,
      taxAmount: 1.5
    });
    expect(order.shipping_tax_amount).toBe(1.5);
    expect(order.total_tax_amount).toBe(1.5);
  });

  it('has no shipping at all when none is given', () => {
    const { order } = priceHistoricalOrder([item()]);
    expect(order).toMatchObject({
      shipping_fee_excl_tax: 0,
      shipping_fee_incl_tax: 0,
      shipping_tax_amount: 0,
      grand_total: 100
    });
  });

  it('sums the lines, their quantities and their weights', () => {
    const { order } = priceHistoricalOrder([
      item({ qty: 3, price: 19.99, taxPercent: 8.25, weight: 0.5 }),
      item({ sku: 'SKU-2', qty: 1, price: 5, weight: 2 })
    ]);
    expect(order).toMatchObject({
      sub_total: 64.97,
      total_qty: 4,
      total_weight: 3.5
    });
    // 59.97 * 8.25% = 4.947525 -> 4.9475; 64.97 + 4.9475
    expect(order.tax_amount).toBe(4.9475);
    expect(order.grand_total).toBe(69.9175);
  });

  it('keeps the figures free of floating point noise', () => {
    const { order } = priceHistoricalOrder([
      item({ price: 0.1, qty: 3 }),
      item({ sku: 'SKU-2', price: 0.2 })
    ]);
    expect(order.sub_total).toBe(0.5);
    expect(order.grand_total).toBe(0.5);
  });
});

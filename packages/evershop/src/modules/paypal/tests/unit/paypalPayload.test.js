import {
  buildPaypalAmount,
  findApprovalUrl,
  formatPaypalAmount,
  isZeroDecimalCurrency
} from '../../services/paypalPayload.js';

describe('formatPaypalAmount', () => {
  it('renders two decimals for normal currencies', () => {
    expect(formatPaypalAmount(12.5, 'USD')).toBe('12.50');
    expect(formatPaypalAmount(12.456, 'EUR')).toBe('12.46');
  });

  it('renders integers for zero-decimal currencies', () => {
    // PayPal rejects decimal values for these with DECIMALS_NOT_SUPPORTED.
    expect(formatPaypalAmount(1234, 'JPY')).toBe('1234');
    expect(formatPaypalAmount(1234.4, 'JPY')).toBe('1234');
    expect(isZeroDecimalCurrency('huf')).toBe(true);
    expect(isZeroDecimalCurrency('USD')).toBe(false);
  });
});

describe('findApprovalUrl', () => {
  it('accepts both the legacy approve rel and the payment_source payer-action rel', () => {
    expect(
      findApprovalUrl([
        { rel: 'self', href: 'https://api.paypal.com/x' },
        { rel: 'approve', href: 'https://paypal.com/approve' }
      ])
    ).toBe('https://paypal.com/approve');
    expect(
      findApprovalUrl([{ rel: 'payer-action', href: 'https://paypal.com/pa' }])
    ).toBe('https://paypal.com/pa');
  });

  it('returns undefined when no approval link exists', () => {
    expect(findApprovalUrl([{ rel: 'self', href: 'x' }])).toBeUndefined();
    expect(findApprovalUrl(undefined)).toBeUndefined();
  });
});

describe('buildPaypalAmount', () => {
  const order = {
    currency: 'USD',
    grand_total: 27.0,
    sub_total: 20.0,
    shipping_fee_excl_tax: 5.0,
    discount_amount: 0,
    total_tax_amount: 2.0
  };
  const items = [
    {
      product_name: 'A',
      product_sku: 'A1',
      qty: 2,
      final_price: 7.5,
      no_shipping_required: false
    },
    {
      product_name: 'B',
      product_sku: 'B1',
      qty: 1,
      final_price: 5.0,
      no_shipping_required: true
    }
  ];

  it('produces a breakdown that sums exactly to the grand total', () => {
    const result = buildPaypalAmount(order, items, false);
    expect(result.identityHolds).toBe(true);
    expect(result.amount.value).toBe('27.00');
    expect(result.amount.breakdown.item_total.value).toBe('20.00');
    expect(result.amount.breakdown.shipping.value).toBe('5.00');
    expect(result.amount.breakdown.tax_total.value).toBe('2.00');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].unit_amount.value).toBe('7.50');
    expect(result.items[0].quantity).toBe('2');
    expect(result.items[1].category).toBe('DIGITAL_GOODS');
  });

  it('drops the breakdown when per-unit rounding drifts from the stored totals', () => {
    // 3 × 3.333 stored as sub_total 10.00: rounded units (3.33 × 3 = 9.99)
    // can't reach it — a mismatched breakdown would be a PayPal 422.
    const driftOrder = {
      currency: 'USD',
      grand_total: 10.0,
      sub_total: 10.0,
      shipping_fee_excl_tax: 0,
      discount_amount: 0,
      total_tax_amount: 0
    };
    const driftItems = [
      { product_name: 'C', product_sku: 'C1', qty: 3, final_price: 3.333 }
    ];
    const result = buildPaypalAmount(driftOrder, driftItems, false);
    expect(result.identityHolds).toBe(false);
    expect(result.items).toBeUndefined();
    expect(result.amount.breakdown).toBeUndefined();
    expect(result.amount.value).toBe('10.00');
  });

  it('uses tax-inclusive values and omits tax_total in price-including-tax mode', () => {
    const inclOrder = {
      currency: 'USD',
      grand_total: 27.0,
      sub_total_incl_tax: 22.0,
      shipping_fee_incl_tax: 5.0,
      discount_amount: 0
    };
    const inclItems = [
      { product_name: 'A', product_sku: 'A1', qty: 2, final_price_incl_tax: 11.0 }
    ];
    const result = buildPaypalAmount(inclOrder, inclItems, true);
    expect(result.identityHolds).toBe(true);
    expect(result.amount.breakdown.item_total.value).toBe('22.00');
    expect(result.amount.breakdown.tax_total).toBeUndefined();
  });

  it('applies the discount inside the identity', () => {
    const discounted = { ...order, grand_total: 22.0, discount_amount: 5.0 };
    const result = buildPaypalAmount(discounted, items, false);
    expect(result.identityHolds).toBe(true);
    expect(result.amount.value).toBe('22.00');
    expect(result.amount.breakdown.discount.value).toBe('5.00');
  });

  it('emits integer values for zero-decimal currencies', () => {
    const jpyOrder = {
      currency: 'JPY',
      grand_total: 1500,
      sub_total: 1200,
      shipping_fee_excl_tax: 200,
      discount_amount: 0,
      total_tax_amount: 100
    };
    const jpyItems = [
      { product_name: 'A', product_sku: 'A1', qty: 2, final_price: 600 }
    ];
    const result = buildPaypalAmount(jpyOrder, jpyItems, false);
    expect(result.identityHolds).toBe(true);
    expect(result.amount.value).toBe('1500');
    expect(result.items[0].unit_amount.value).toBe('600');
  });
});

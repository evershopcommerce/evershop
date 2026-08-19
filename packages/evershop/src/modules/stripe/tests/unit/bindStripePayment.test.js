import { describe, expect, it } from '@jest/globals';
import {
  cartOwnsOrder,
  orderAmountInSmallestUnit,
  stripeAmountMatchesOrder
} from '../../services/bindStripePayment.js';

describe('cartOwnsOrder', () => {
  it('accepts the cart that placed the order', () => {
    expect(cartOwnsOrder({ cart_id: 41 }, { cart_id: 41 })).toBe(true);
    expect(cartOwnsOrder({ cart_id: '41' }, { cart_id: 41 })).toBe(true);
  });

  it('rejects pairing a cheap cart with a different order', () => {
    expect(cartOwnsOrder({ cart_id: 1 }, { cart_id: 99 })).toBe(false);
  });
});

describe('stripeAmountMatchesOrder', () => {
  const expensiveOrder = { grand_total: '500.00', currency: 'usd' };

  it('accepts a PaymentIntent for the order total', () => {
    const amount = orderAmountInSmallestUnit(expensiveOrder);
    expect(amount).toBe(50000);
    expect(
      stripeAmountMatchesOrder({ amount, currency: 'usd' }, expensiveOrder)
    ).toBe(true);
    expect(
      stripeAmountMatchesOrder({ amount, currency: 'USD' }, expensiveOrder)
    ).toBe(true);
  });

  it('rejects a cheap PaymentIntent against an expensive order', () => {
    const cheap = orderAmountInSmallestUnit({
      grand_total: '1.00',
      currency: 'usd'
    });
    expect(cheap).toBe(100);
    expect(
      stripeAmountMatchesOrder({ amount: cheap, currency: 'usd' }, expensiveOrder)
    ).toBe(false);
  });

  it('rejects a currency mismatch at the same numeric amount', () => {
    expect(
      stripeAmountMatchesOrder({ amount: 50000, currency: 'eur' }, expensiveOrder)
    ).toBe(false);
  });
});

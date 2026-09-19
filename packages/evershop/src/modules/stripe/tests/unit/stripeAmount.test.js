import {
  paymentIntentMatchesOrder,
  toStripeMinorUnit
} from '../../services/stripeAmount.js';

describe('toStripeMinorUnit', () => {
  it('converts major units to minor for two-decimal currencies', () => {
    expect(toStripeMinorUnit(10, 'USD')).toBe(1000);
    expect(toStripeMinorUnit(10.5, 'USD')).toBe(1050);
    expect(toStripeMinorUnit(10.99, 'EUR')).toBe(1099);
  });

  it('accepts the decimal-as-string values the pg driver returns', () => {
    expect(toStripeMinorUnit('500.0000', 'USD')).toBe(50000);
  });

  it('keeps zero-decimal currencies whole', () => {
    expect(toStripeMinorUnit(1000, 'JPY')).toBe(1000);
  });
});

describe('paymentIntentMatchesOrder', () => {
  it('accepts an exact amount + currency match (currency case-insensitive)', () => {
    expect(
      paymentIntentMatchesOrder(
        { grand_total: 25, currency: 'USD' },
        { amount: 2500, currency: 'usd' }
      )
    ).toBe(true);
  });

  it('rejects an underpaid amount — the order-hijack vector', () => {
    // $500 order, intent only charged $5.00 (500 minor units).
    expect(
      paymentIntentMatchesOrder(
        { grand_total: 500, currency: 'USD' },
        { amount: 500, currency: 'usd' }
      )
    ).toBe(false);
  });

  it('rejects a currency mismatch even when the number matches', () => {
    expect(
      paymentIntentMatchesOrder(
        { grand_total: 25, currency: 'USD' },
        { amount: 2500, currency: 'eur' }
      )
    ).toBe(false);
  });
});

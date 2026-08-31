import { resolveRefundStatus, toMinorUnits } from '../../services/paypalRefund.js';

describe('resolveRefundStatus', () => {
  it('is a full refund when the cumulative total reaches the capture', () => {
    expect(resolveRefundStatus(100, 100, 'USD')).toBe('paypal_refunded');
    expect(resolveRefundStatus(100, 120, 'USD')).toBe('paypal_refunded');
  });

  it('is partial below the capture amount', () => {
    expect(resolveRefundStatus(100, 40, 'USD')).toBe(
      'paypal_partial_refunded'
    );
  });

  it('compares in minor units so float noise cannot fake a partial', () => {
    // 0.1 + 0.2 !== 0.3 in floats; in cents it is.
    expect(resolveRefundStatus(0.3, 0.1 + 0.2, 'USD')).toBe('paypal_refunded');
  });

  it('handles zero-decimal currencies', () => {
    expect(toMinorUnits(1500, 'JPY')).toBe(1500);
    expect(toMinorUnits(15, 'USD')).toBe(1500);
    expect(resolveRefundStatus(1500, 1500, 'JPY')).toBe('paypal_refunded');
  });
});

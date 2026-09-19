import {
  findCaptureTransaction,
  isRefundAlreadyRecorded,
  remainingRefundableMinorUnits,
  resolveRefundStatus,
  sumRefundedAmount,
  toMinorUnits
} from '../../services/refundStatus.js';

describe('toMinorUnits', () => {
  it('converts to the currency smallest unit', () => {
    expect(toMinorUnits(10, 'USD')).toBe(1000);
    expect(toMinorUnits('12.50', 'USD')).toBe(1250);
    expect(toMinorUnits(1000, 'JPY')).toBe(1000); // zero-decimal
  });
  it('treats null/undefined as zero', () => {
    expect(toMinorUnits(null, 'USD')).toBe(0);
    expect(toMinorUnits(undefined, 'USD')).toBe(0);
  });
});

describe('resolveRefundStatus', () => {
  it('is full when cumulative reaches the captured amount', () => {
    expect(resolveRefundStatus('stripe', 100, 100, 'USD')).toEqual({
      status: 'stripe_refunded',
      isFullRefund: true
    });
  });
  it('is partial when cumulative is below the captured amount', () => {
    expect(resolveRefundStatus('stripe', 100, 40, 'USD')).toEqual({
      status: 'stripe_partial_refunded',
      isFullRefund: false
    });
  });
  it('names the status after the payment method', () => {
    expect(resolveRefundStatus('paypal', 50, 50, 'USD').status).toBe(
      'paypal_refunded'
    );
  });
  it('compares in minor units, immune to float noise', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in float, but equal to 0.30 in minor units.
    expect(resolveRefundStatus('stripe', 0.3, 0.1 + 0.2, 'USD')).toEqual({
      status: 'stripe_refunded',
      isFullRefund: true
    });
  });
});

describe('findCaptureTransaction', () => {
  it('returns the most recent non-refund row (newest-first input)', () => {
    const txns = [
      { transaction_id: 'ref_2', amount: 5, payment_action: 'refund' },
      { transaction_id: 'cap_1', amount: 100, payment_action: 'capture' },
      { transaction_id: 'auth_1', amount: 100, payment_action: 'authorize' }
    ];
    expect(findCaptureTransaction(txns).transaction_id).toBe('cap_1');
  });
  it('returns undefined when every row is a refund', () => {
    expect(
      findCaptureTransaction([
        { transaction_id: 'r', amount: 1, payment_action: 'refund' }
      ])
    ).toBeUndefined();
  });
  it('returns undefined for an empty ledger', () => {
    expect(findCaptureTransaction([])).toBeUndefined();
  });
});

describe('sumRefundedAmount', () => {
  it('sums only the refund rows (mixed string/number amounts)', () => {
    const txns = [
      { transaction_id: 'cap', amount: 100, payment_action: 'capture' },
      { transaction_id: 'r1', amount: '30', payment_action: 'refund' },
      { transaction_id: 'r2', amount: 20, payment_action: 'refund' }
    ];
    expect(sumRefundedAmount(txns)).toBe(50);
  });
  it('is 0 when there are no refunds', () => {
    expect(
      sumRefundedAmount([
        { transaction_id: 'cap', amount: 100, payment_action: 'capture' }
      ])
    ).toBe(0);
  });
});

describe('isRefundAlreadyRecorded', () => {
  const txns = [
    { transaction_id: 'cap', amount: 100, payment_action: 'capture' },
    { transaction_id: 'ref_1', amount: 10, payment_action: 'refund' }
  ];
  it('true when the gateway refund id is already present (idempotency)', () => {
    expect(isRefundAlreadyRecorded(txns, 'ref_1')).toBe(true);
  });
  it('false for a new refund id', () => {
    expect(isRefundAlreadyRecorded(txns, 'ref_new')).toBe(false);
  });
});

describe('remainingRefundableMinorUnits', () => {
  it('is captured minus already-refunded, in minor units', () => {
    // Captured 100.00, refunded 30.00 → 70.00 remaining = 7000 minor units.
    expect(remainingRefundableMinorUnits(100, 30, 'USD')).toBe(7000);
  });
  it('is 0 once fully refunded', () => {
    expect(remainingRefundableMinorUnits(100, 100, 'USD')).toBe(0);
  });
  it('goes negative when over-refunded (the caller rejects amount > remaining)', () => {
    expect(remainingRefundableMinorUnits(100, 120, 'USD')).toBeLessThan(0);
  });
  it('handles zero-decimal currencies', () => {
    expect(remainingRefundableMinorUnits(1000, 400, 'JPY')).toBe(600);
  });
});

import { paymentIntentKind } from '../../services/confirmPaymentIntent.js';
import { resolveStripeReturnOutcome } from '../../services/returnOutcome.js';

describe('resolveStripeReturnOutcome', () => {
  it('treats a captured or authorized intent as success', () => {
    expect(resolveStripeReturnOutcome('succeeded')).toBe('success');
    expect(resolveStripeReturnOutcome('requires_capture')).toBe('success');
  });

  it('treats a still-processing async payment as pending, not failure', () => {
    // The regression this guards: `processing` used to be marked stripe_failed
    // and the cart reactivated, even though the webhook would later succeed.
    expect(resolveStripeReturnOutcome('processing')).toBe('pending');
  });

  it('treats a genuine dead-end status as failure', () => {
    expect(resolveStripeReturnOutcome('requires_payment_method')).toBe('failure');
    expect(resolveStripeReturnOutcome('requires_action')).toBe('failure');
    expect(resolveStripeReturnOutcome('canceled')).toBe('failure');
  });
});

describe('paymentIntentKind', () => {
  it('records a succeeded intent as a capture and requires_capture as an authorization', () => {
    expect(paymentIntentKind('succeeded')).toBe('capture');
    expect(paymentIntentKind('requires_capture')).toBe('authorization');
  });

  it('has nothing to record for an intent that holds no money', () => {
    for (const status of [
      'processing',
      'requires_payment_method',
      'requires_action',
      'canceled',
      ''
    ]) {
      expect(paymentIntentKind(status)).toBeNull();
    }
  });

  it('agrees with the return outcome: only a success outcome has money to record', () => {
    for (const status of [
      'succeeded',
      'requires_capture',
      'processing',
      'requires_payment_method',
      'canceled'
    ]) {
      expect(paymentIntentKind(status) !== null).toBe(
        resolveStripeReturnOutcome(status) === 'success'
      );
    }
  });
});

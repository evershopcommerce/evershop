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

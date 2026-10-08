import {
  HANDLED_PAYMENT_INTENT_EVENTS,
  isHandledPaymentIntentEvent
} from '../../services/webhookEvents.js';

/**
 * The webhook acts only on these PaymentIntent money-in events; everything else
 * Stripe delivers (charge.*, refund.*, payout.*) must be ignored with a 200 so
 * Stripe does not retry it. Regression guard for "Order with id undefined not
 * found", where unhandled events fell through to the order lookup and threw.
 */
describe('isHandledPaymentIntentEvent', () => {
  it('is true for each handled PaymentIntent money-in event', () => {
    expect(isHandledPaymentIntentEvent('payment_intent.succeeded')).toBe(true);
    expect(
      isHandledPaymentIntentEvent('payment_intent.amount_capturable_updated')
    ).toBe(true);
    expect(isHandledPaymentIntentEvent('payment_intent.payment_failed')).toBe(
      true
    );
    expect(isHandledPaymentIntentEvent('payment_intent.canceled')).toBe(true);
  });

  it('is false for charge.refunded (money-out, handled by its own branch)', () => {
    expect(isHandledPaymentIntentEvent('charge.refunded')).toBe(false);
  });

  it('is false for sibling events that carry no order_id (the bug source)', () => {
    for (const type of [
      'charge.succeeded',
      'charge.updated',
      'charge.captured',
      'refund.created',
      'refund.updated',
      'payout.paid',
      // A payment_intent.* event we deliberately do NOT act on — proves the
      // allow-list is exact, not a `payment_intent.` prefix match.
      'payment_intent.created'
    ]) {
      expect(isHandledPaymentIntentEvent(type)).toBe(false);
    }
  });

  it('is false for empty / unknown strings', () => {
    expect(isHandledPaymentIntentEvent('')).toBe(false);
    expect(isHandledPaymentIntentEvent('totally.made.up')).toBe(false);
  });

  it('the allow-list is exactly the four money-in events', () => {
    expect([...HANDLED_PAYMENT_INTENT_EVENTS].sort()).toEqual(
      [
        'payment_intent.amount_capturable_updated',
        'payment_intent.canceled',
        'payment_intent.payment_failed',
        'payment_intent.succeeded'
      ].sort()
    );
  });
});

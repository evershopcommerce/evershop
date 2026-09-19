/**
 * The Stripe PaymentIntent lifecycle events the webhook processes (money-in).
 * Every other event Stripe delivers — `charge.*`, `refund.*`, `payout.*`, and the
 * like — is acknowledged and ignored so Stripe never retries an event we do not
 * act on. `charge.refunded` (money-out) is handled by its own branch and is
 * deliberately NOT in this set.
 */
export const HANDLED_PAYMENT_INTENT_EVENTS = [
  'payment_intent.succeeded',
  'payment_intent.amount_capturable_updated',
  'payment_intent.payment_failed',
  'payment_intent.canceled'
] as const;

export type HandledPaymentIntentEvent =
  (typeof HANDLED_PAYMENT_INTENT_EVENTS)[number];

/**
 * Whether the webhook processes this event as a PaymentIntent money-in event.
 * Anything else — including `charge.refunded` (its own branch) and sibling
 * events that carry no `order_id` — returns false and is ignored with a 200.
 * This is the allow-list that closes the "Order with id undefined not found"
 * throw, where unhandled events fell through to the order lookup.
 */
export function isHandledPaymentIntentEvent(
  type: string
): type is HandledPaymentIntentEvent {
  return (HANDLED_PAYMENT_INTENT_EVENTS as readonly string[]).includes(type);
}

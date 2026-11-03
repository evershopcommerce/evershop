/**
 * Every checkout payment method this module serves. Venmo is a PayPal funding
 * source: same credentials, same PayPal order, same statuses and money
 * handlers — only the buyer-facing approval differs (JS SDK button instead of
 * a redirect). Anything that looks up a local order by its PayPal order must
 * accept all of them.
 */
export const PAYPAL_METHOD_CODES = ['paypal', 'venmo'];

/** Venmo only settles in US dollars. */
export const VENMO_CURRENCIES = ['USD'];

export type PaypalPaymentState =
  | 'authorized'
  | 'captured'
  | 'pending'
  | 'failed'
  | 'refunded'
  | 'partial_refunded';

/**
 * The payment status code for an order of `paymentMethod` in `state`. Core
 * builds status codes as `<payment_method>_<state>` (captureOrder,
 * resolveRefundStatus), so a Venmo order must carry `venmo_*` statuses — a
 * `paypal_*` one would make core move it to a status nobody registered.
 */
export function paymentStatusFor(
  paymentMethod: string | null | undefined,
  state: PaypalPaymentState
): string {
  return `${paymentMethod || 'paypal'}_${state}`;
}

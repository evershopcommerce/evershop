export type StripeReturnOutcome = 'success' | 'pending' | 'failure';

/**
 * Maps a PaymentIntent status seen at the `/stripe/return` redirect to what the
 * storefront should do next.
 *
 * - `succeeded` / `requires_capture` — the money is secured (captured or
 *   authorized). Send the buyer to the order success page.
 * - `processing` — a delayed-notification method (some wallets, bank debits)
 *   still settling. This is NOT a failure; the webhook finalizes it. Marking it
 *   failed and dumping the buyer back to the cart (the old behavior) was wrong.
 * - anything else (`requires_payment_method`, `requires_action`, `canceled`, …)
 *   is a genuine dead end → back to the cart to retry.
 *
 * Intentionally independent of the capture/authorize setting: both `succeeded`
 * and `requires_capture` mean the buyer's part is done, and the webhook maps
 * each to the correct EverShop status regardless of the current mode (which can
 * change mid-flight).
 */
export function resolveStripeReturnOutcome(status: string): StripeReturnOutcome {
  if (status === 'succeeded' || status === 'requires_capture') {
    return 'success';
  }
  if (status === 'processing') {
    return 'pending';
  }
  return 'failure';
}

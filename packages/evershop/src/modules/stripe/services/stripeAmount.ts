import smallestUnit from 'zero-decimal-currencies';

/**
 * An amount expressed in the currency's smallest unit — the integer Stripe
 * charges in. `10.00 USD` → `1000`, `1000 JPY` → `1000` (zero-decimal). Stripe's
 * `PaymentIntent.amount` is always a minor-unit integer.
 */
export function toStripeMinorUnit(amount: number | string, currency: string): number {
  return parseInt(smallestUnit(amount, currency), 10);
}

/**
 * True when a PaymentIntent's charged amount and currency match the order it is
 * about to be applied to. The order is the authoritative, server-owned record of
 * what is owed; the webhook trusts nothing until this holds. Closes the
 * "pay for a cheap cart, apply the intent to an expensive order" hole — the
 * charge amount and the order it settles are bound together, not taken on faith
 * from client-supplied ids.
 */
export function paymentIntentMatchesOrder(
  order: { grand_total: number | string; currency: string },
  paymentIntent: { amount: number; currency: string }
): boolean {
  return (
    paymentIntent.amount === toStripeMinorUnit(order.grand_total, order.currency) &&
    String(paymentIntent.currency).toLowerCase() ===
      String(order.currency).toLowerCase()
  );
}

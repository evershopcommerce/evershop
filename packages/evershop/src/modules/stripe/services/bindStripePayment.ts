import smallestUnit from 'zero-decimal-currencies';

/**
 * Public POST /stripe/paymentIntents accepts cart_id and order_id independently.
 * The webhook later marks metadata.order_id paid. These helpers bind the
 * PaymentIntent to the order that owns the cart and to that order's total.
 */

export function cartOwnsOrder(
  cart: { cart_id: number | string },
  order: { cart_id: number | string }
): boolean {
  return String(cart.cart_id) === String(order.cart_id);
}

export function orderAmountInSmallestUnit(order: {
  grand_total: number | string;
  currency: string;
}): number {
  return parseInt(smallestUnit(order.grand_total, order.currency), 10);
}

export function stripeAmountMatchesOrder(
  paymentIntent: { amount: number; currency: string },
  order: { grand_total: number | string; currency: string }
): boolean {
  if (!Number.isFinite(paymentIntent.amount)) {
    return false;
  }
  return (
    paymentIntent.amount === orderAmountInSmallestUnit(order) &&
    String(paymentIntent.currency).toLowerCase() ===
      String(order.currency).toLowerCase()
  );
}

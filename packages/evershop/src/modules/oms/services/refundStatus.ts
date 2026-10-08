import smallestUnit from 'zero-decimal-currencies';

/**
 * An amount in the currency's smallest integer unit (10.00 USD → 1000,
 * 1000 JPY → 1000). Comparing refunds in minor units keeps float noise from
 * flipping a full refund into a "partial" one.
 */
export function toMinorUnits(
  value: string | number | null | undefined,
  currency: string
): number {
  return parseInt(smallestUnit(value ?? 0, currency), 10);
}

/**
 * Decide the payment status for a refund. Full vs partial is the cumulative
 * refunded total measured against the captured amount, in minor units. Status
 * codes follow the `<method>_refunded` / `<method>_partial_refunded` convention
 * that the built-in gateways register (Stripe/PayPal), so core stays
 * gateway-agnostic.
 */
export function resolveRefundStatus(
  paymentMethod: string,
  captureAmount: string | number,
  totalRefunded: string | number,
  currency: string
): { status: string; isFullRefund: boolean } {
  const isFullRefund =
    toMinorUnits(totalRefunded, currency) >=
    toMinorUnits(captureAmount, currency);
  return {
    status: isFullRefund
      ? `${paymentMethod}_refunded`
      : `${paymentMethod}_partial_refunded`,
    isFullRefund
  };
}

/**
 * One row of the refund ledger — the subset of a `payment_transaction` the pure
 * refund math needs. Both the admin path (`refundOrder`) and the recorder
 * (`recordRefund`) reduce over these.
 */
export interface RefundLedgerRow {
  transaction_id: string | null;
  amount: string | number;
  payment_action: string | null;
}

/**
 * The captured transaction a refund draws down: the most recent NON-refund row.
 * Callers pass the transactions newest-first (`ORDER BY id DESC`), so `find`
 * returns the latest capture/authorization — the one whose gateway id the refund
 * targets (matters for PayPal, where capture mints a new id).
 */
export function findCaptureTransaction<T extends RefundLedgerRow>(
  txns: T[]
): T | undefined {
  return txns.find((t) => t.payment_action !== 'refund');
}

/** Total already refunded across the order's refund transactions (major units). */
export function sumRefundedAmount(txns: RefundLedgerRow[]): number {
  return txns
    .filter((t) => t.payment_action === 'refund')
    .reduce((sum, t) => sum + (parseFloat(String(t.amount)) || 0), 0);
}

/**
 * Idempotency guard: has this gateway refund id already been recorded? An admin
 * refund and its webhook echo carry the same id, so the second is a no-op.
 */
export function isRefundAlreadyRecorded(
  txns: RefundLedgerRow[],
  transactionId: string
): boolean {
  return txns.some((t) => t.transaction_id === transactionId);
}

/**
 * How much of the captured amount is still refundable, in minor units:
 * captured − already-refunded. A refund is allowed only when its own minor-unit
 * amount is > 0 and ≤ this. Minor units so float noise can't leak a cent past
 * the guard.
 */
export function remainingRefundableMinorUnits(
  capturedAmount: string | number,
  alreadyRefunded: string | number,
  currency: string
): number {
  return (
    toMinorUnits(capturedAmount, currency) -
    toMinorUnits(alreadyRefunded, currency)
  );
}

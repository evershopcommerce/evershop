import {
  commit,
  insertOnUpdate,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { debug } from '../../../lib/log/logger.js';
import { getConnection } from '../../../lib/postgres/connection.js';
import addOrderActivityLog from '../../oms/services/addOrderActivityLog.js';
import { updatePaymentStatus } from '../../oms/services/updatePaymentStatus.js';
import { isZeroDecimalCurrency } from './paypalPayload.js';

export function toMinorUnits(
  value: string | number | undefined,
  currency: string
): number {
  const factor = isZeroDecimalCurrency(currency) ? 1 : 100;
  return Math.round((parseFloat(String(value ?? 0)) || 0) * factor);
}

/**
 * Full vs partial is decided by cumulative refunds against the captured
 * amount, compared in integer minor units so float noise can't turn a full
 * refund into a "partial" one.
 */
export function resolveRefundStatus(
  captureAmount: string | number,
  totalRefunded: string | number,
  currency: string
): 'paypal_refunded' | 'paypal_partial_refunded' {
  return toMinorUnits(totalRefunded, currency) >=
    toMinorUnits(captureAmount, currency)
    ? 'paypal_refunded'
    : 'paypal_partial_refunded';
}

interface RefundResource {
  id: string;
  amount?: { value?: string; currency_code?: string };
  seller_payable_breakdown?: { total_refunded_amount?: { value?: string } };
}

/**
 * Record one PayPal refund against a local order: insert the refund
 * transaction (idempotent — a webhook replay of an admin-initiated refund is
 * a no-op), set paypal_refunded / paypal_partial_refunded, log activity.
 * Shared by the admin refund API and the PAYMENT.CAPTURE.REFUNDED webhook.
 */
export async function recordPaypalRefund(
  order: any,
  refund: RefundResource,
  captureId?: string
): Promise<{ paymentStatus: string; alreadyRecorded: boolean }> {
  const connection = await getConnection();
  await startTransaction(connection);
  try {
    const existing = await select()
      .from('payment_transaction')
      .where('transaction_id', '=', refund.id)
      .and('payment_transaction_order_id', '=', order.order_id)
      .load(connection);
    if (existing) {
      await rollback(connection);
      debug(
        `PayPal refund ${refund.id} for order ${order.uuid} already recorded`
      );
      return { paymentStatus: order.payment_status, alreadyRecorded: true };
    }

    // The capture being refunded — by id when the caller knows it, otherwise
    // the order's capture transaction.
    let captureQuery = select()
      .from('payment_transaction')
      .where('payment_transaction_order_id', '=', order.order_id);
    if (captureId) {
      captureQuery = captureQuery.and('transaction_id', '=', captureId);
    } else {
      captureQuery = captureQuery.and('payment_action', '=', 'capture');
    }
    const capture = await captureQuery.load(connection);
    if (!capture) {
      throw new Error(
        `Cannot find the capture transaction for order ${order.uuid}`
      );
    }

    const refundAmount = parseFloat(refund.amount?.value ?? '0');
    // PayPal reports the cumulative total on the refund object; fall back to
    // our own refund rows when it's absent.
    let totalRefunded = parseFloat(
      refund.seller_payable_breakdown?.total_refunded_amount?.value ?? 'NaN'
    );
    if (Number.isNaN(totalRefunded)) {
      const priorRefunds = await select()
        .from('payment_transaction')
        .where('payment_transaction_order_id', '=', order.order_id)
        .and('payment_action', '=', 'refund')
        .execute(connection);
      totalRefunded =
        priorRefunds.reduce(
          (sum, row) => sum + (parseFloat(row.amount) || 0),
          0
        ) + refundAmount;
    }
    const paymentStatus = resolveRefundStatus(
      capture.amount,
      totalRefunded,
      order.currency
    );

    await insertOnUpdate('payment_transaction', [
      'transaction_id',
      'payment_transaction_order_id'
    ])
      .given({
        payment_transaction_order_id: order.order_id,
        transaction_id: refund.id,
        amount: refundAmount,
        parent_transaction_id: capture.transaction_id,
        payment_action: 'refund',
        transaction_type: 'online',
        additional_information: JSON.stringify(refund)
      })
      .execute(connection);
    await updatePaymentStatus(order.order_id, paymentStatus, connection);
    await addOrderActivityLog(
      order.order_id,
      `Refunded ${refundAmount} ${order.currency}. Refund ID: ${refund.id}`,
      false,
      connection
    );
    await commit(connection);
    return { paymentStatus, alreadyRecorded: false };
  } catch (e) {
    await rollback(connection);
    throw e;
  }
}

import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { OrderRow, PaymentTransactionRow } from '../../../types/db/index.js';
import { PaymentStatus } from '../../../types/order.js';
import { getPaymentMethodFactory } from '../../checkout/services/getAvailablePaymentMethods.js';
import { recordRefund } from './recordRefund.js';
import {
  findCaptureTransaction,
  remainingRefundableMinorUnits,
  sumRefundedAmount,
  toMinorUnits
} from './refundStatus.js';

export interface RefundOrderResult {
  status: string;
  isFullRefund: boolean;
}

/**
 * Refund an order through its payment method's registered `refund` handler.
 *
 * Core is the whole pipeline: it validates (the method supports refunds, the
 * order is in a refundable status, and the amount is within what remains
 * captured), calls the handler — the one gateway-specific step, which returns the
 * gateway's confirmed refund id and amount — then records the refund and emits
 * `order_refunded` via `recordRefund`. A method that registered no `refund`
 * handler cannot be refunded here.
 *
 * The gateway call runs outside any DB transaction (it's network I/O);
 * `recordRefund` opens its own short transaction for the writes.
 */
export async function refundOrder(
  uuid: string,
  amount: number
): Promise<RefundOrderResult> {
  const order = (await select()
    .from('order')
    .where('uuid', '=', uuid)
    .load(pool)) as OrderRow | null;
  if (!order) {
    throw new Error(`Order ${uuid} not found`);
  }
  if (!order.payment_method) {
    throw new Error(`Order ${uuid} has no payment method`);
  }

  // Capability gate: the method registered a refund handler.
  const factory = await getPaymentMethodFactory(order.payment_method);
  if (!factory?.refund) {
    throw new Error(
      `Payment method "${order.payment_method}" does not support refunds`
    );
  }

  // State gate: the current payment status allows a refund (mirrors the admin
  // button's `Order.canRefund`).
  const statuses = getConfig('oms.order.paymentStatus', {}) as Record<
    string,
    PaymentStatus
  >;
  if (!statuses[order.payment_status]?.isRefundable) {
    throw new Error(
      `Order ${uuid} is not refundable in its current status (${order.payment_status})`
    );
  }

  const txQuery = select()
    .from('payment_transaction')
    .orderBy('payment_transaction_id', 'DESC');
  txQuery.where('payment_transaction_order_id', '=', order.order_id);
  const txns = (await txQuery.execute(pool)) as PaymentTransactionRow[];
  const capture = findCaptureTransaction(txns);
  if (!capture) {
    throw new Error(`Order ${uuid} has no captured payment to refund`);
  }

  // Amount gate: never refund more than remains captured. Compared in minor
  // units so float noise can't slip a cent through.
  const refundedSoFar = sumRefundedAmount(txns);
  const remainingMinor = remainingRefundableMinorUnits(
    capture.amount,
    refundedSoFar,
    order.currency
  );
  if (!(amount > 0) || toMinorUnits(amount, order.currency) > remainingMinor) {
    throw new Error(
      'Refund amount must be greater than 0 and at most the remaining captured amount'
    );
  }

  // The one gateway-specific step. The handler returns the gateway's confirmed
  // refund id + amount; core does all the recording + the event.
  const result = await factory.refund({
    order,
    amount,
    currency: order.currency,
    transaction: capture
  });

  const recorded = await recordRefund({
    order,
    transactionId: result.transactionId,
    amount: result.amount,
    currency: result.currency ?? order.currency,
    offline: result.offline,
    raw: result.raw
  });
  return { status: recorded.status, isFullRefund: recorded.isFullRefund };
}

import {
  commit,
  getConnection,
  insertOnUpdate,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { getConfig } from '../../../lib/util/getConfig.js';
import { OrderRow, PaymentTransactionRow } from '../../../types/db/index.js';
import { PaymentStatus } from '../../../types/order.js';
import { getPaymentMethodFactory } from '../../checkout/services/getAvailablePaymentMethods.js';
import addOrderActivityLog from './addOrderActivityLog.js';
import { updatePaymentStatus } from './updatePaymentStatus.js';

export interface CaptureOrderResult {
  status: string;
}

/**
 * Capture an authorized order through its payment method's registered `capture`
 * handler.
 *
 * Core is the whole pipeline: it validates (the method supports capture, the
 * order is in a capturable status), calls the handler — the one gateway step,
 * which settles the authorization and returns the gateway's capture id + amount
 * — then records the capture transaction and moves the payment status to
 * `<method>_captured`. Recording the capture matters: some gateways (PayPal)
 * mint a NEW capture id that later refunds must target.
 *
 * Full capture only (the authorized amount); partial capture is not exposed.
 *
 * The gateway call runs outside the DB transaction (it's network I/O); the
 * recording opens its own short transaction.
 */
export async function captureOrder(uuid: string): Promise<CaptureOrderResult> {
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

  // Capability gate: the method registered a capture handler.
  const factory = await getPaymentMethodFactory(order.payment_method);
  if (!factory?.capture) {
    throw new Error(
      `Payment method "${order.payment_method}" does not support capture`
    );
  }

  // State gate: the current payment status allows a capture (mirrors the admin
  // button's `Order.canCapture`).
  const statuses = getConfig('oms.order.paymentStatus', {}) as Record<
    string,
    PaymentStatus
  >;
  if (!statuses[order.payment_status]?.isCapturable) {
    throw new Error(
      `Order ${uuid} is not capturable in its current status (${order.payment_status})`
    );
  }

  // The authorization to settle: the most recent txn that is neither a capture
  // nor a refund. At an authorized order that is the sole authorization row.
  const txQuery = select()
    .from('payment_transaction')
    .orderBy('payment_transaction_id', 'DESC');
  txQuery.where('payment_transaction_order_id', '=', order.order_id);
  const txns = (await txQuery.execute(pool)) as PaymentTransactionRow[];
  const authorization =
    txns.find(
      (t) => t.payment_action !== 'refund' && t.payment_action !== 'capture'
    ) ?? txns[0];
  if (!authorization) {
    throw new Error(`Order ${uuid} has no authorization to capture`);
  }

  // The one gateway-specific step.
  const result = await factory.capture({ order, transaction: authorization });

  const capturedStatus = `${order.payment_method}_captured`;
  const currency = result.currency ?? order.currency;
  const connection = await getConnection(pool);
  try {
    await startTransaction(connection);
    // Record the capture. When the gateway reuses the authorization id (Stripe's
    // PaymentIntent) insertOnUpdate updates that row in place; when it mints a
    // new id (PayPal) it inserts a new capture row that refunds will target.
    await insertOnUpdate('payment_transaction', [
      'transaction_id',
      'payment_transaction_order_id'
    ])
      .given({
        payment_transaction_order_id: order.order_id,
        transaction_id: result.transactionId,
        amount: result.amount,
        parent_transaction_id:
          authorization.transaction_id === result.transactionId
            ? null
            : authorization.transaction_id,
        payment_action: 'capture',
        transaction_type: result.offline ? 'offline' : 'online',
        additional_information:
          result.raw !== undefined ? JSON.stringify(result.raw) : null
      })
      .execute(connection);
    await updatePaymentStatus(order.order_id, capturedStatus, connection);
    await addOrderActivityLog(
      order.order_id,
      `Captured ${result.amount} ${currency}. Transaction ID: ${result.transactionId}`,
      false,
      connection
    );
    await commit(connection);
  } catch (e) {
    await rollback(connection);
    throw e;
  }
  return { status: capturedStatus };
}

import {
  commit,
  getConnection,
  insertOnUpdate,
  PoolClient,
  rollback,
  select,
  startTransaction
} from '@evershop/postgres-query-builder';
import { emit } from '../../../lib/event/emitter.js';
import { debug } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import { OrderRow } from '../../../types/db/index.js';
import addOrderActivityLog from './addOrderActivityLog.js';
import {
  findCaptureTransaction,
  isRefundAlreadyRecorded,
  resolveRefundStatus,
  sumRefundedAmount
} from './refundStatus.js';
import { updatePaymentStatus } from './updatePaymentStatus.js';

export interface RecordRefundParams {
  order: OrderRow;
  /** The gateway's refund transaction id — recording key + idempotency. */
  transactionId: string;
  /** The refunded amount, in major currency units. */
  amount: number;
  /** Defaults to the order's currency. */
  currency?: string;
  /** Offline method (COD): record the transaction as offline. */
  offline?: boolean;
  /** Raw gateway response, stored on `additional_information` for audit. */
  raw?: unknown;
}

export interface RecordRefundResult {
  status: string;
  isFullRefund: boolean;
  alreadyRecorded: boolean;
}

interface TxnRow {
  transaction_id: string | null;
  amount: string | number;
  payment_action: string | null;
}

/**
 * The core refund recorder — the guaranteed home of the `order_refunded` event.
 *
 * Records the refund `payment_transaction` idempotently (an admin refund and its
 * gateway webhook echo dedupe on `transactionId`), computes full-vs-partial
 * against the captured amount, sets the payment status, logs, and emits
 * `order_refunded` exactly once. Every payment method routes refunds through
 * here, so no gateway has to remember to emit or to record.
 *
 * Pass `conn` to enroll in a caller's transaction (a webhook already holding one);
 * omit it to run standalone.
 */
export async function recordRefund(
  params: RecordRefundParams,
  conn?: PoolClient
): Promise<RecordRefundResult> {
  const { order, transactionId, amount, offline, raw } = params;
  const currency = params.currency ?? order.currency;
  if (!order.payment_method) {
    throw new Error(`Order ${order.uuid} has no payment method to refund`);
  }
  const connection = conn ?? (await getConnection(pool));
  try {
    if (!conn) {
      await startTransaction(connection);
    }

    // One read covers idempotency, the capture, and prior refunds.
    const txQuery = select()
      .from('payment_transaction')
      .orderBy('payment_transaction_id', 'DESC');
    txQuery.where('payment_transaction_order_id', '=', order.order_id);
    const txns = (await txQuery.execute(connection)) as TxnRow[];

    if (isRefundAlreadyRecorded(txns, transactionId)) {
      if (!conn) {
        await rollback(connection);
      }
      debug(`Refund ${transactionId} for order ${order.uuid} already recorded`);
      return {
        status: order.payment_status,
        isFullRefund: false,
        alreadyRecorded: true
      };
    }

    const capture = findCaptureTransaction(txns);
    if (!capture) {
      throw new Error(
        `Cannot find the captured transaction to refund for order ${order.uuid}`
      );
    }
    const totalRefunded = sumRefundedAmount(txns) + amount;

    const { status, isFullRefund } = resolveRefundStatus(
      order.payment_method,
      capture.amount,
      totalRefunded,
      currency
    );

    await insertOnUpdate('payment_transaction', [
      'transaction_id',
      'payment_transaction_order_id'
    ])
      .given({
        payment_transaction_order_id: order.order_id,
        transaction_id: transactionId,
        amount,
        parent_transaction_id: capture.transaction_id,
        payment_action: 'refund',
        transaction_type: offline ? 'offline' : 'online',
        additional_information: raw !== undefined ? JSON.stringify(raw) : null
      })
      .execute(connection);

    await updatePaymentStatus(order.order_id, status, connection);
    await addOrderActivityLog(
      order.order_id,
      `Refunded ${amount} ${currency}. Refund ID: ${transactionId}`,
      false,
      connection
    );
    // Emitted on this connection so the event lives or dies with the record and
    // is visible to subscribers only after commit.
    await emit(
      'order_refunded',
      {
        orderId: order.order_id,
        amount,
        currency,
        isFullRefund,
        transactionId,
        paymentMethod: order.payment_method
      },
      connection
    );

    if (!conn) {
      await commit(connection);
    }
    return { status, isFullRefund, alreadyRecorded: false };
  } catch (e) {
    if (!conn) {
      await rollback(connection);
    }
    throw e;
  }
}

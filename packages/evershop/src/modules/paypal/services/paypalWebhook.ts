import { select } from '@evershop/postgres-query-builder';
import type { AxiosInstance } from 'axios';
import { debug, warning } from '../../../lib/log/logger.js';
import { pool } from '../../../lib/postgres/connection.js';
import addOrderActivityLog from '../../oms/services/addOrderActivityLog.js';
import { recordRefund } from '../../oms/services/recordRefund.js';
import { updatePaymentStatus } from '../../oms/services/updatePaymentStatus.js';
import {
  assertPaypalAmountMatchesOrder,
  finalizePaypalOrderOrFail,
  PaypalAmountMismatchError,
  recordPaypalPayment
} from './finalizePaypalOrder.js';

export interface PaypalWebhookEvent {
  event_type?: string;
  resource?: any;
}

export interface EventOrderKeys {
  paypalOrderId?: string;
  invoiceNumber?: string;
  captureId?: string;
}

/**
 * Pull every key usable to find the local order out of a webhook event.
 * Capture events carry the PayPal order id in supplementary_data and our
 * order number in invoice_id (set at create). Refund events carry invoice_id
 * plus an "up" link pointing at the refunded capture.
 */
export function extractEventOrderKeys(
  event: PaypalWebhookEvent
): EventOrderKeys {
  const resource = event.resource || {};
  if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
    return { paypalOrderId: resource.id };
  }
  const keys: EventOrderKeys = {
    paypalOrderId: resource.supplementary_data?.related_ids?.order_id,
    invoiceNumber: resource.invoice_id
  };
  if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
    const upLink: string | undefined = resource.links?.find(
      (link) => link.rel === 'up'
    )?.href;
    const match = upLink?.match(/\/captures\/([^/?]+)/);
    if (match) {
      keys.captureId = match[1];
    }
  } else if (event.event_type?.startsWith('PAYMENT.CAPTURE.')) {
    keys.captureId = resource.id;
  }
  return keys;
}

interface ResolvedOrder {
  order: any;
  /**
   * How the order was found. Only `paypalOrderId` proves the event is about
   * the PayPal order the store created for it: an invoice id is just our
   * order number, which anyone can put on a PayPal order of their own.
   */
  matchedBy: 'paypalOrderId' | 'invoiceNumber' | 'captureId';
}

async function resolveOrderForEvent(
  event: PaypalWebhookEvent
): Promise<ResolvedOrder | null> {
  const keys = extractEventOrderKeys(event);
  if (keys.paypalOrderId) {
    const order = await select()
      .from('order')
      .where('integration_order_id', '=', keys.paypalOrderId)
      .and('payment_method', '=', 'paypal')
      .load(pool);
    if (order) {
      return { order, matchedBy: 'paypalOrderId' };
    }
  }
  if (keys.invoiceNumber) {
    const order = await select()
      .from('order')
      .where('order_number', '=', keys.invoiceNumber)
      .and('payment_method', '=', 'paypal')
      .load(pool);
    if (order) {
      return { order, matchedBy: 'invoiceNumber' };
    }
  }
  if (keys.captureId) {
    const transaction = await select()
      .from('payment_transaction')
      .where('transaction_id', '=', keys.captureId)
      .load(pool);
    if (transaction) {
      // Another payment method on the same PayPal app (Fastlane) records
      // PayPal capture ids too: its orders are not ours to update.
      const order = await select()
        .from('order')
        .where('order_id', '=', transaction.payment_transaction_order_id)
        .and('payment_method', '=', 'paypal')
        .load(pool);
      if (order) {
        return { order, matchedBy: 'captureId' };
      }
    }
  }
  return null;
}

// Events that move an order's payment state from a capture. They are only
// accepted for the PayPal order the store created (see ResolvedOrder).
const CAPTURE_STATE_EVENTS = [
  'PAYMENT.CAPTURE.COMPLETED',
  'PAYMENT.CAPTURE.PENDING',
  'PAYMENT.CAPTURE.DENIED'
];

/**
 * Record a capture event's money only when it is for the order's amount;
 * otherwise mark a still-pending order failed for admin review. Returns
 * whether the caller may record it.
 */
async function captureAmountAccepted(order: any, resource: any) {
  try {
    await assertPaypalAmountMatchesOrder(
      order,
      resource.amount,
      `PayPal capture ${resource.id}`
    );
    return true;
  } catch (e) {
    if (!(e instanceof PaypalAmountMismatchError)) {
      throw e;
    }
    warning(`PayPal webhook for order ${order.uuid}: ${e.message}`);
    if (order.payment_status === 'pending') {
      await updatePaymentStatus(order.order_id, 'paypal_failed');
      await addOrderActivityLog(
        order.order_id,
        `PayPal payment failed: ${e.message}`,
        false,
        pool as any
      );
    }
    return false;
  }
}

const SETTLED = [
  'paypal_captured',
  'paypal_refunded',
  'paypal_partial_refunded'
];

/**
 * Apply one verified webhook event. Unknown events and unknown orders are
 * ignored (the endpoint still answers 200 — PayPal retries anything else).
 * Guards are ordering-safe: a late/duplicate event never downgrades a settled
 * order.
 */
export async function handlePaypalWebhookEvent(
  event: PaypalWebhookEvent,
  axiosInstance: AxiosInstance
): Promise<void> {
  const resolved = await resolveOrderForEvent(event);
  if (!resolved) {
    debug(
      `PayPal webhook ${event.event_type}: no matching local order, ignoring`
    );
    return;
  }
  const { order, matchedBy } = resolved;
  const resource = event.resource || {};
  if (
    CAPTURE_STATE_EVENTS.includes(event.event_type as string) &&
    matchedBy !== 'paypalOrderId'
  ) {
    warning(
      `PayPal webhook ${event.event_type}: capture ${resource.id} is not for the PayPal order of local order ${order.uuid}, ignoring`
    );
    return;
  }
  switch (event.event_type) {
    case 'CHECKOUT.ORDER.APPROVED': {
      // The buyer approved but never came back through the return page.
      if (order.payment_status === 'pending') {
        await finalizePaypalOrderOrFail(order, axiosInstance);
      }
      break;
    }
    case 'PAYMENT.CAPTURE.COMPLETED': {
      if (
        ['paypal_refunded', 'paypal_partial_refunded', 'canceled'].includes(
          order.payment_status
        )
      ) {
        break;
      }
      if (!(await captureAmountAccepted(order, resource))) {
        break;
      }
      await recordPaypalPayment(
        order,
        resource,
        event,
        'capture',
        'paypal_captured'
      );
      break;
    }
    case 'PAYMENT.CAPTURE.PENDING': {
      // Never downgrade an already-settled order on out-of-order delivery.
      if (
        SETTLED.includes(order.payment_status) ||
        order.payment_status === 'canceled'
      ) {
        break;
      }
      if (!(await captureAmountAccepted(order, resource))) {
        break;
      }
      await recordPaypalPayment(
        order,
        resource,
        event,
        'capture',
        'paypal_pending'
      );
      break;
    }
    case 'PAYMENT.CAPTURE.DENIED': {
      if (!['pending', 'paypal_pending'].includes(order.payment_status)) {
        break;
      }
      // Per spec decision D5: mark failed for admin review, never auto-cancel
      // (money state after a denial can be ambiguous).
      await updatePaymentStatus(order.order_id, 'paypal_failed');
      await addOrderActivityLog(
        order.order_id,
        `PayPal denied the payment capture. Capture ID: ${resource.id}`,
        false,
        pool as any
      );
      break;
    }
    case 'PAYMENT.CAPTURE.REFUNDED': {
      await recordRefund({
        order,
        transactionId: resource.id,
        amount: parseFloat(resource.amount?.value ?? '0'),
        currency: resource.amount?.currency_code ?? order.currency,
        raw: resource
      });
      break;
    }
    default:
      debug(`PayPal webhook ${event.event_type}: unhandled event type`);
  }
}

/**
 * Verify the transmission against PayPal's verify-webhook-signature API.
 * Returns false on FAILURE; throws on transport errors so the caller can 500
 * (PayPal will retry).
 */
export async function verifyPaypalWebhookSignature(
  axiosInstance: AxiosInstance,
  headers: Record<string, unknown>,
  event: PaypalWebhookEvent,
  webhookId: string
): Promise<boolean> {
  const { data } = await axiosInstance.post(
    '/v1/notifications/verify-webhook-signature',
    {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: event
    }
  );
  if (data.verification_status !== 'SUCCESS') {
    warning(
      `PayPal webhook signature verification failed for ${event.event_type}`
    );
    return false;
  }
  return true;
}

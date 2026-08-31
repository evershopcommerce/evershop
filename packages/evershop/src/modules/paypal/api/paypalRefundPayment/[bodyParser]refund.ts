import { select } from '@evershop/postgres-query-builder';
import { error } from '../../../../lib/log/logger.js';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD,
  OK
} from '../../../../lib/util/httpStatus.js';
import { EvershopRequest } from '../../../../types/request.js';
import { EvershopResponse } from '../../../../types/response.js';
import { formatPaypalAmount } from '../../services/paypalPayload.js';
import { recordPaypalRefund, toMinorUnits } from '../../services/paypalRefund.js';
import { createAxiosInstance } from '../../services/requester.js';

const REFUNDABLE_STATUSES = ['paypal_captured', 'paypal_partial_refunded'];

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next
) => {
  try {
    const { order_id, amount } = request.body;
    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .and('payment_method', '=', 'paypal')
      .load(pool);
    if (!order || !REFUNDABLE_STATUSES.includes(order.payment_status)) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Invalid order'
        }
      });
      return;
    }
    // The capture being refunded. Orders captured through the legacy
    // authorize flow (pre-hardening) recorded no capture row — those must be
    // refunded from the PayPal dashboard.
    const capture = await select()
      .from('payment_transaction')
      .where('payment_transaction_order_id', '=', order.order_id)
      .and('payment_action', '=', 'capture')
      .load(pool);
    if (!capture) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Cannot find the capture transaction for this order'
        }
      });
      return;
    }
    const refunds = await select()
      .from('payment_transaction')
      .where('payment_transaction_order_id', '=', order.order_id)
      .and('payment_action', '=', 'refund')
      .execute(pool);
    const refundedSoFar = refunds.reduce(
      (sum, row) => sum + (parseFloat(row.amount) || 0),
      0
    );
    const requested = parseFloat(amount);
    const remainingMinor =
      toMinorUnits(capture.amount, order.currency) -
      toMinorUnits(refundedSoFar, order.currency);
    if (
      !Number.isFinite(requested) ||
      requested <= 0 ||
      toMinorUnits(requested, order.currency) > remainingMinor
    ) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: `Refund amount must be between 0 and the remaining captured amount`
        }
      });
      return;
    }

    const axiosInstance = await createAxiosInstance(request);
    const paypalResponse = await axiosInstance.post(
      `/v2/payments/captures/${capture.transaction_id}/refund`,
      {
        amount: {
          value: formatPaypalAmount(requested, order.currency),
          currency_code: order.currency
        },
        invoice_id: order.order_number
      },
      {
        headers: {
          // Sequence-numbered idempotency: a retry of the same (nth) refund
          // dedupes at PayPal; the next intentional refund gets a new key.
          'PayPal-Request-Id': `${order.uuid}-refund-${refunds.length + 1}`,
          // Without this PayPal returns a minimal body — no amount, no
          // seller_payable_breakdown — and the recorded refund would be 0.
          Prefer: 'return=representation'
        },
        validateStatus: (status) => status < 500
      }
    );
    const refund = paypalResponse.data;
    if (
      paypalResponse.status >= 400 ||
      !['COMPLETED', 'PENDING'].includes(refund.status)
    ) {
      response.status(INTERNAL_SERVER_ERROR);
      response.json({
        error: {
          status: INTERNAL_SERVER_ERROR,
          message:
            refund.message || `PayPal refund failed (status ${refund.status})`
        }
      });
      return;
    }
    if (!refund.amount?.value) {
      refund.amount = {
        value: formatPaypalAmount(requested, order.currency),
        currency_code: order.currency
      };
    }
    const result = await recordPaypalRefund(
      order,
      refund,
      capture.transaction_id
    );
    response.status(OK);
    response.json({
      data: {
        refundId: refund.id,
        paymentStatus: result.paymentStatus
      }
    });
  } catch (err) {
    error(err);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: err.message
      }
    });
  }
};

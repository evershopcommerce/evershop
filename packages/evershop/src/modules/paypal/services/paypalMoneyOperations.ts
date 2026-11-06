import type { AxiosInstance } from 'axios';
import { toMinorUnits } from '../../oms/services/refundStatus.js';
import { formatPaypalAmount } from './paypalPayload.js';

interface MoneyOperationResult {
  transactionId: string;
  amount: number;
  raw: unknown;
}

/**
 * PayPal-Request-Id of an admin refund. It names the refund being asked for
 * (which capture, how much was refunded before it, how much), not the moment
 * it was asked: a retry after a lost response or a double click replays the
 * first refund at PayPal instead of refunding again, while a later refund of
 * the same amount, with more refunded before it, gets a new key.
 */
export function refundRequestId(
  orderUuid: string,
  captureId: string,
  refundedBefore: number,
  amount: number,
  currency: string
): string {
  return `${orderUuid}-refund-${captureId}-${toMinorUnits(
    refundedBefore,
    currency
  )}-${toMinorUnits(amount, currency)}`;
}

/**
 * The completed capture PayPal already made for an authorization (in the
 * PayPal dashboard, or by an earlier attempt whose response was lost).
 */
async function findExistingCapture(
  axiosInstance: AxiosInstance,
  authorizationId: string
): Promise<any | undefined> {
  const { data: authorization } = await axiosInstance.get(
    `/v2/payments/authorizations/${authorizationId}`
  );
  const orderLink: string | undefined = authorization?.links?.find(
    (link) => link.rel === 'up'
  )?.href;
  const paypalOrderId = orderLink?.match(/\/checkout\/orders\/([^/?]+)/)?.[1];
  if (!paypalOrderId) {
    return undefined;
  }
  const { data: paypalOrder } = await axiosInstance.get(
    `/v2/checkout/orders/${paypalOrderId}`
  );
  return paypalOrder?.purchase_units?.[0]?.payments?.captures?.find(
    (capture) => capture.status === 'COMPLETED'
  );
}

/**
 * Capture an authorization. One capture per authorization, so the request id
 * is the authorization's: a retry replays it. An authorization PayPal already
 * captured is recorded from that capture instead of failing.
 */
export async function capturePaypalAuthorization(
  axiosInstance: AxiosInstance,
  orderUuid: string,
  authorizationId: string,
  authorizedAmount: number
): Promise<MoneyOperationResult> {
  const response = await axiosInstance.post(
    `/v2/payments/authorizations/${authorizationId}/capture`,
    {},
    {
      headers: {
        'PayPal-Request-Id': `${orderUuid}-capture-${authorizationId}`,
        Prefer: 'return=representation'
      },
      validateStatus: (status: number) => status < 500
    }
  );
  let capture = response.data;
  if (
    response.status >= 400 &&
    capture?.details?.[0]?.issue === 'AUTHORIZATION_ALREADY_CAPTURED'
  ) {
    capture = await findExistingCapture(axiosInstance, authorizationId);
    if (!capture) {
      throw new Error(
        'PayPal already captured this authorization, but the capture is not completed yet'
      );
    }
  } else if (response.status >= 400 || capture?.status !== 'COMPLETED') {
    throw new Error(
      capture?.message || `PayPal capture failed (status ${capture?.status})`
    );
  }
  return {
    transactionId: capture.id,
    amount: parseFloat(capture.amount?.value ?? String(authorizedAmount)),
    raw: capture
  };
}

/** Refund (part of) a capture; see `refundRequestId` for the retry key. */
export async function refundPaypalCapture(
  axiosInstance: AxiosInstance,
  params: {
    order: { uuid: string; currency: string; order_number: string };
    captureId: string;
    amount: number;
    refundedBefore: number;
  }
): Promise<MoneyOperationResult> {
  const { order, captureId, amount, refundedBefore } = params;
  const response = await axiosInstance.post(
    `/v2/payments/captures/${captureId}/refund`,
    {
      amount: {
        value: formatPaypalAmount(amount, order.currency),
        currency_code: order.currency
      },
      invoice_id: order.order_number
    },
    {
      headers: {
        'PayPal-Request-Id': refundRequestId(
          order.uuid,
          captureId,
          refundedBefore,
          amount,
          order.currency
        ),
        // Without this PayPal returns a minimal body (no amount) and we'd
        // record a 0 refund.
        Prefer: 'return=representation'
      },
      validateStatus: (status: number) => status < 500
    }
  );
  const refund = response.data;
  if (
    response.status >= 400 ||
    !['COMPLETED', 'PENDING'].includes(refund.status)
  ) {
    throw new Error(
      refund.message || `PayPal refund failed (status ${refund.status})`
    );
  }
  const value =
    refund.amount?.value ?? formatPaypalAmount(amount, order.currency);
  return { transactionId: refund.id, amount: parseFloat(value), raw: refund };
}

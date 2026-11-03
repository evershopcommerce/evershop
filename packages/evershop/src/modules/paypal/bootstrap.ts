import path from 'path';
import config from 'config';
import { registerJob } from '../../lib/cronjob/jobManager.js';
import { CONSTANTS } from '../../lib/helpers.js';
import { warning } from '../../lib/log/logger.js';
import { getConfig } from '../../lib/util/getConfig.js';
import {
  PaymentMethodFactory,
  registerPaymentMethod
} from '../checkout/services/getAvailablePaymentMethods.js';
import {
  getSetting,
  getStoreCurrency
} from '../setting/services/setting.js';
import {
  PAYPAL_METHOD_CODES,
  PaypalPaymentState,
  paymentStatusFor,
  VENMO_CURRENCIES
} from './services/paymentMethods.js';
import { formatPaypalAmount } from './services/paypalPayload.js';
import { createStandaloneAxiosInstance } from './services/requester.js';
import { voidPaymentTransaction } from './services/voidPaymentTransaction.js';

export default async () => {
  // One status set per payment method this module serves: core derives
  // status codes from the order's method (`<method>_captured`,
  // `<method>_refunded`), so a Venmo order needs `venmo_*` next to `paypal_*`.
  const statuses: Record<PaypalPaymentState, Record<string, unknown>> = {
    authorized: {
      name: 'Authorized',
      isCancelable: true,
      isCapturable: true,
      isVoidable: true,
      badge: 'warning'
    },
    captured: {
      name: 'Captured',
      // Canceling a captured order would have to refund the money first;
      // blocking here keeps cancelOrder from failing halfway through the
      // void hook.
      isCancelable: false,
      isRefundable: true,
      badge: 'success'
    },
    pending: {
      name: 'Payment Pending',
      // Money is in flight (eCheck, review) — neither cancelable nor paid
      // until PayPal reports the capture COMPLETED or DENIED.
      isCancelable: false,
      badge: 'warning'
    },
    failed: {
      name: 'Failed',
      isCancelable: true,
      badge: 'critical'
    },
    refunded: {
      name: 'Refunded',
      isCancelable: false,
      badge: 'destructive'
    },
    partial_refunded: {
      name: 'Partial Refunded',
      isCancelable: false,
      isRefundable: true,
      badge: 'destructive'
    }
  };
  const psoMapping: Record<string, string> = {
    'authorized:*': 'processing',
    'captured:*': 'processing',
    'captured:delivered': 'completed',
    'pending:*': 'processing',
    'failed:*': 'new',
    'refunded:*': 'closed',
    'partial_refunded:*': 'processing',
    'partial_refunded:delivered': 'completed'
  };
  const paymentStatus = {};
  const paymentStatusMapping = {};
  for (const method of PAYPAL_METHOD_CODES) {
    for (const [state, detail] of Object.entries(statuses)) {
      paymentStatus[paymentStatusFor(method, state as PaypalPaymentState)] =
        detail;
    }
    for (const [key, orderStatus] of Object.entries(psoMapping)) {
      paymentStatusMapping[`${method}_${key}`] = orderStatus;
    }
  }
  config.util.setModuleDefaults('oms', {
    order: { paymentStatus, psoMapping: paymentStatusMapping }
  });

  // Reconcile abandoned pending PayPal orders: capture the ones the buyer
  // actually approved (missed-webhook / lost-return-leg fallback), cancel and
  // restock the rest. registerJob throws on a bad cron expression — degrade
  // to a skipped job, never a store that won't boot.
  try {
    const paypalConfig = getConfig('system.paypal', {}) as Record<
      string,
      unknown
    >;
    registerJob({
      name: 'paypalReconcileAbandonedOrders',
      schedule: String(paypalConfig.reconcileSchedule || '*/30 * * * *'),
      resolve: path.resolve(
        CONSTANTS.MODULESPATH,
        'paypal/services/reconcileAbandonedOrders.js'
      ),
      enabled: paypalConfig.reconcileEnabled !== false
    });
  } catch (e) {
    warning(
      `Skipping paypalReconcileAbandonedOrders job registration: ${e.message}`
    );
  }

  // Venmo is a PayPal funding source: the money moves through the same PayPal
  // order, so both methods share these handlers.
  const paypalOperations: Pick<
    PaymentMethodFactory,
    'capture' | 'void' | 'refund'
  > = {
    // Capture an authorized payment. Capturing an authorization mints a NEW
    // capture id at PayPal — core (captureOrder) records it as the capture
    // transaction so later refunds target it. The handler only hits PayPal.
    capture: async ({ order, transaction }) => {
      if (!transaction?.transaction_id) {
        throw new Error('Missing PayPal authorization id to capture');
      }
      const axiosInstance = await createStandaloneAxiosInstance();
      const captureResponse = await axiosInstance.post(
        `/v2/payments/authorizations/${transaction.transaction_id}/capture`,
        {},
        {
          headers: {
            'PayPal-Request-Id': `${order.uuid}-capture-${Date.now()}`,
            Prefer: 'return=representation'
          },
          validateStatus: (status: number) => status < 500
        }
      );
      const capture = captureResponse.data;
      if (captureResponse.status >= 400 || capture.status !== 'COMPLETED') {
        throw new Error(
          capture.message || `PayPal capture failed (status ${capture.status})`
        );
      }
      return {
        transactionId: capture.id,
        amount: parseFloat(capture.amount?.value ?? String(transaction.amount)),
        raw: capture
      };
    },
    // Release an uncaptured authorization. Core calls this from cancelOrder when
    // a voidable order is canceled; the handler voids the authorization.
    void: async ({ order }) => {
      await voidPaymentTransaction(order.order_id);
    },
    // The one gateway-specific step: refund the capture at PayPal and report
    // what it moved. Core (refundOrder → recordRefund) records the transaction,
    // decides full vs partial, sets the status, and emits `order_refunded`.
    refund: async ({ order, amount, transaction }) => {
      if (!transaction.transaction_id) {
        throw new Error('Missing PayPal capture transaction id to refund');
      }
      const axiosInstance = await createStandaloneAxiosInstance();
      const paypalResponse = await axiosInstance.post(
        `/v2/payments/captures/${transaction.transaction_id}/refund`,
        {
          amount: {
            value: formatPaypalAmount(amount, order.currency),
            currency_code: order.currency
          },
          invoice_id: order.order_number
        },
        {
          headers: {
            'PayPal-Request-Id': `${order.uuid}-refund-${Date.now()}`,
            // Without this PayPal returns a minimal body (no amount) and we'd
            // record a 0 refund.
            Prefer: 'return=representation'
          },
          validateStatus: (status: number) => status < 500
        }
      );
      const refund = paypalResponse.data;
      if (
        paypalResponse.status >= 400 ||
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
  };

  registerPaymentMethod({
    init: async () => ({
      code: 'paypal',
      name: await getSetting('paypalDisplayName', 'PayPal')
    }),
    validator: async () => {
      const paypalConfig = getConfig('system.paypal', {});
      let paypalStatus;
      if (paypalConfig?.status) {
        paypalStatus = paypalConfig.status;
      } else {
        paypalStatus = await getSetting('paypalPaymentStatus', 0);
      }
      if (parseInt(paypalStatus, 10) === 1) {
        return true;
      } else {
        return false;
      }
    },
    ...paypalOperations
  });

  registerPaymentMethod({
    init: async () => ({
      code: 'venmo',
      name: await getSetting('paypalVenmoDisplayName', 'Venmo')
    }),
    validator: async () => {
      const paypalConfig = getConfig('system.paypal', {});
      let venmoStatus;
      if (paypalConfig?.venmoStatus) {
        venmoStatus = paypalConfig.venmoStatus;
      } else {
        venmoStatus = await getSetting('paypalVenmoStatus', 0);
      }
      return (
        parseInt(venmoStatus, 10) === 1 &&
        VENMO_CURRENCIES.includes(getStoreCurrency())
      );
    },
    ...paypalOperations
  });
};

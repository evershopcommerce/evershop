import path from 'path';
import { select } from '@evershop/postgres-query-builder';
import config from 'config';
import { registerJob } from '../../lib/cronjob/jobManager.js';
import { CONSTANTS } from '../../lib/helpers.js';
import { warning } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';
import { getConfig } from '../../lib/util/getConfig.js';
import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethods.js';
import { sumRefundedAmount } from '../oms/services/refundStatus.js';
import { getSetting } from '../setting/services/setting.js';
import {
  capturePaypalAuthorization,
  refundPaypalCapture
} from './services/paypalMoneyOperations.js';
import { createStandaloneAxiosInstance } from './services/requester.js';
import { voidPaymentTransaction } from './services/voidPaymentTransaction.js';

export default async () => {
  const paypalPaymentStatus = {
    order: {
      paymentStatus: {
        paypal_authorized: {
          name: 'Authorized',
          isCancelable: true,
          isCapturable: true,
          isVoidable: true,
          badge: 'warning'
        },
        paypal_captured: {
          name: 'Captured',
          // Canceling a captured order would have to refund the money first;
          // blocking here keeps cancelOrder from failing halfway through the
          // void hook.
          isCancelable: false,
          isRefundable: true,
          badge: 'success'
        },
        paypal_pending: {
          name: 'Payment Pending',
          // Money is in flight (eCheck, review) — neither cancelable nor paid
          // until PayPal reports the capture COMPLETED or DENIED.
          isCancelable: false,
          badge: 'warning'
        },
        paypal_failed: {
          name: 'Failed',
          isCancelable: true,
          badge: 'critical'
        },
        paypal_refunded: {
          name: 'Refunded',
          isCancelable: false,
          badge: 'destructive'
        },
        paypal_partial_refunded: {
          name: 'Partial Refunded',
          isCancelable: false,
          isRefundable: true,
          badge: 'destructive'
        }
      },
      psoMapping: {
        'paypal_authorized:*': 'processing',
        'paypal_captured:*': 'processing',
        'paypal_captured:delivered': 'completed',
        'paypal_pending:*': 'processing',
        'paypal_failed:*': 'new',
        'paypal_refunded:*': 'closed',
        'paypal_partial_refunded:*': 'processing',
        'paypal_partial_refunded:delivered': 'completed'
      }
    }
  };
  config.util.setModuleDefaults('oms', paypalPaymentStatus);

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
    // Capture an authorized payment. Capturing an authorization mints a NEW
    // capture id at PayPal — core (captureOrder) records it as the capture
    // transaction so later refunds target it. The handler only hits PayPal.
    capture: async ({ order, transaction }) => {
      if (!transaction?.transaction_id) {
        throw new Error('Missing PayPal authorization id to capture');
      }
      return capturePaypalAuthorization(
        await createStandaloneAxiosInstance(),
        order.uuid,
        transaction.transaction_id,
        parseFloat(String(transaction.amount))
      );
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
      const ledger = await select()
        .from('payment_transaction')
        .where('payment_transaction_order_id', '=', order.order_id)
        .execute(pool);
      return refundPaypalCapture(await createStandaloneAxiosInstance(), {
        order,
        captureId: transaction.transaction_id,
        amount,
        refundedBefore: sumRefundedAmount(ledger)
      });
    }
  });
};

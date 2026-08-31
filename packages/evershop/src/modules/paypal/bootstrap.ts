import path from 'path';
import config from 'config';
import { registerJob } from '../../lib/cronjob/jobManager.js';
import { CONSTANTS } from '../../lib/helpers.js';
import { warning } from '../../lib/log/logger.js';
import { getConfig } from '../../lib/util/getConfig.js';
import { hookAfter } from '../../lib/util/hookable.js';
import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethods.js';
import { getSetting } from '../setting/services/setting.js';
import { voidPaymentTransaction } from './services/voidPaymentTransaction.js';

export default async () => {
  const paypalPaymentStatus = {
    order: {
      paymentStatus: {
        paypal_authorized: {
          name: 'Authorized',
          isCancelable: true,
          badge: 'warning'
        },
        paypal_captured: {
          name: 'Captured',
          // Canceling a captured order would have to refund the money first;
          // blocking here keeps cancelOrder from failing halfway through the
          // void hook.
          isCancelable: false,
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

  hookAfter('changePaymentStatus', async (order, orderID, status) => {
    if (status !== 'canceled') {
      return;
    }
    if (order.payment_method !== 'paypal') {
      return;
    }
    await voidPaymentTransaction(orderID);
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
    }
  });
};

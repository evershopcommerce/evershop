import config from 'config';
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

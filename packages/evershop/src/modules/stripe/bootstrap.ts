import config from 'config';
import { getConfig } from '../../lib/util/getConfig.js';
import { hookAfter } from '../../lib/util/hookable.js';
import { PaymentStatus } from '../../types/order.js';
import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethods.js';
import { getSetting } from '../setting/services/setting.js';
import { cancelPaymentIntent } from './services/cancelPayment.js';

export default async () => {
  const stripePaymentStatus = {
    order: {
      paymentStatus: {
        stripe_authorized: {
          name: 'Authorized',
          isDefault: false,
          isCancelable: true,
          badge: 'warning'
        },
        stripe_captured: {
          name: 'Captured',
          isDefault: false,
          isCancelable: false,
          badge: 'success'
        },
        stripe_failed: {
          name: 'Failed',
          isDefault: false,
          isCancelable: true,
          badge: 'critical'
        },
        stripe_refunded: {
          name: 'Refunded',
          badge: 'destructive',
          isCancelable: false,
          isDefault: false
        },
        stripe_partial_refunded: {
          name: 'Partial Refunded',
          badge: 'destructive',
          isCancelable: false,
          isDefault: false
        }
      },
      psoMapping: {
        'stripe_authorized:*': 'processing',
        'stripe_captured:*': 'processing',
        'stripe_captured:delivered': 'completed',
        'stripe_failed:*': 'new',
        'stripe_refunded:*': 'closed',
        'stripe_partial_refunded:*': 'processing',
        'stripe_partial_refunded:delivered': 'completed'
      }
    }
  } as {
    order: {
      paymentStatus: {
        [key: string]: PaymentStatus;
      };
      psoMapping: {
        [key: string]: string;
      };
    };
  };
  config.util.setModuleDefaults('oms', stripePaymentStatus);

  hookAfter('changePaymentStatus', async (order, orderID, status) => {
    if (status !== 'canceled') {
      return;
    }
    if (order.payment_method !== 'stripe') {
      return;
    }
    await cancelPaymentIntent(orderID);
  });

  registerPaymentMethod({
    init: async () => ({
      code: 'stripe',
      name: await getSetting('stripeDisplayName', 'Stripe')
    }),
    validator: async () => {
      const stripeConfig = getConfig('system.stripe', {}) ?? {};
      let stripeStatus;
      if (stripeConfig.status) {
        stripeStatus = stripeConfig.status;
      } else {
        stripeStatus = await getSetting('stripePaymentStatus', 0);
      }
      if (parseInt(stripeStatus, 10) === 1) {
        return true;
      } else {
        return false;
      }
    }
  });
};

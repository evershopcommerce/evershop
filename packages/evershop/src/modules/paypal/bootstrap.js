import { getConfig } from '../../lib/util/getConfig.js';
import { hookAfter } from '../../lib/util/hookable.js';
import { addProcessor } from '../../lib/util/registry.js';
import { registerPaymentMethod } from '../checkout/services/getAvailablePaymentMethos.js';
import { getSetting } from '../setting/services/setting.js';
import { voidPaymentTransaction } from './services/voidPaymentTransaction.js';

export default async () => {
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
      methodCode: 'paypal',
      methodName: await getSetting('paypalDisplayName', 'PayPal')
    }),
    validator: async () => {
      const paypalConfig = getConfig('system.paypal', {});
      let paypalStatus;
      if (paypalConfig.status) {
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

import { hookAfter } from '../../lib/util/hookable.js';
import { addProcessor } from '../../lib/util/registry.js';
import { getSetting } from '../setting/services/setting.js';
import { voidPaymentTransaction } from './services/voidPaymentTransaction.js';

export default () => {
  addProcessor('cartFields', (fields) => {
    fields.push({
      key: 'payment_method',
      resolvers: [
        async function resolver(paymentMethod) {
          // Do nothing if the payment method is not paypal
          if (paymentMethod !== 'paypal') {
            return paymentMethod;
          } else {
            // Validate the payment method
            const paypalStatus = await getSetting('paypalPaymentStatus');
            if (parseInt(paypalStatus, 10) !== 1) {
              return null;
            } else {
              this.setError('payment_method', undefined);
              return paymentMethod;
            }
          }
        }
      ]
    });
    return fields;
  });

  hookAfter('changePaymentStatus', async (order, orderID, status) => {
    if (status !== 'canceled') {
      return;
    }
    if (order.payment_method !== 'paypal') {
      return;
    }
    await voidPaymentTransaction(orderID);
  });
};

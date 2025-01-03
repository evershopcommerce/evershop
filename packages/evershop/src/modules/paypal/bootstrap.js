const { hookAfter } = require('../../lib/util/hookable');
const { addProcessor } = require('../../lib/util/registry');
const { getSetting } = require('../setting/services/setting');
const { voidPaymentTransaction } = require('./services/voidPaymentTransaction');

module.exports = () => {
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

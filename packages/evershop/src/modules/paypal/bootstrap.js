const { addProcessor } = require('../../lib/util/registry');
const { getSetting } = require('../setting/services/setting');

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
};

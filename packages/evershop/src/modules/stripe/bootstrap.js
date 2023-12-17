const { addProcessor } = require('../../lib/util/registry');
const { getSetting } = require('../setting/services/setting');

module.exports = () => {
  addProcessor('cartFields', (fields) => {
    fields.push({
      key: 'payment_method',
      resolvers: [
        async function resolver(paymentMethod) {
          if (paymentMethod !== 'stripe') {
            return paymentMethod;
          } else {
            // Validate the payment method
            const stripeStatus = await getSetting('stripePaymentStatus');
            if (parseInt(stripeStatus, 10) !== 1) {
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

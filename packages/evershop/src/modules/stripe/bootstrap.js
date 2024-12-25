const config = require('config');
const { addProcessor } = require('../../lib/util/registry');
const { getSetting } = require('../setting/services/setting');
const { hookAfter } = require('../../lib/util/hookable');
const { cancelPaymentIntent } = require('./services/cancelPayment');

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

  const authorizedPaymentStatus = {
    order: {
      paymentStatus: {
        authorized: {
          name: 'Authorized',
          badge: 'attention',
          progress: 'incomplete'
        }
      },
      psoMapping: {
        'authorized:*': 'processing'
      }
    }
  };
  config.util.setModuleDefaults('oms', authorizedPaymentStatus);

  hookAfter('changePaymentStatus', async (order, orderID, status) => {
    if (status !== 'canceled') {
      return;
    }
    if (order.payment_method !== 'stripe') {
      return;
    }
    await cancelPaymentIntent(orderID);
  });
};

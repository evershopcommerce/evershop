const { addProcessor } = require('../../packages/evershop/src/lib/util/registry');

module.exports = () => {
  addProcessor('cartFields', (fields) => {
    fields.push({
      key: 'payment_method',
      resolvers: [
        async function resolver(paymentMethod) {
          // Do nothing if the payment method is not paypal
          if (paymentMethod !== 'momo') {
            return paymentMethod;
          } else {
            this.setError('payment_method', undefined);
            return paymentMethod;
          }
        }
      ]
    });
    return fields;
  });
};

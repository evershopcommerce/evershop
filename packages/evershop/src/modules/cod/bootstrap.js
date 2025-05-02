import { addProcessor } from '../../lib/util/registry.js';
import { getSetting } from '../../modules/setting/services/setting.js';

export default () => {
  addProcessor('cartFields', (fields) => {
    fields.push({
      key: 'payment_method',
      resolvers: [
        async function resolver(paymentMethod) {
          if (paymentMethod !== 'cod') {
            return paymentMethod;
          } else {
            // Validate the payment method
            const codStatus = await getSetting('codPaymentStatus');
            if (parseInt(codStatus, 10) !== 1) {
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

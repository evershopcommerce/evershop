import { getAvailablePaymentMethods } from '../../../services/index.js';

export default {
  Cart: {
    availablePaymentMethods: async ({ grandTotal }) => {
      const methods = await getAvailablePaymentMethods({
        cartTotal: grandTotal
      });
      return methods;
    }
  }
};

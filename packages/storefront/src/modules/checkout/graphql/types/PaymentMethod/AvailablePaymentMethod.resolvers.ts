import { getAvailablePaymentMethods } from '../../../services/index.js';

export default {
  Cart: {
    availablePaymentMethods: async () => {
      const methods = await getAvailablePaymentMethods();
      return methods;
    }
  }
};

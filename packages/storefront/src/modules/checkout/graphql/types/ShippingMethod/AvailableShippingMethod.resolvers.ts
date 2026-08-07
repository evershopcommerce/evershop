import { getAvailableShippingMethods } from '../../../services/getAvailableShippingMethods.js';

export default {
  Cart: {
    availableShippingMethods: async (
      { uuid },
      { country, province, postcode }
    ) => {
      const methods = await getAvailableShippingMethods(
        uuid,
        country,
        province,
        postcode
      );
      return methods;
    }
  }
};

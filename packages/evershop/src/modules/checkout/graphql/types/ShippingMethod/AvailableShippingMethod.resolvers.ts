import { getAvailableShippingMethods } from '../../../services/getAvailableShippingMethods.js';

export default {
  Cart: {
    availableShippingMethods: async (
      { uuid },
      { country, administrativeArea, locality, dependentLocality, postalCode }
    ) =>
      getAvailableShippingMethods(uuid, {
        country,
        administrative_area: administrativeArea,
        locality,
        dependent_locality: dependentLocality,
        postal_code: postalCode
      })
  }
};

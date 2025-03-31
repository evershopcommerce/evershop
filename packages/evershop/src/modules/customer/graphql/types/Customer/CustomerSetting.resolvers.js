import { getConfig } from '@evershop/evershop/src/lib/util/getConfig.js';

export default {
  Setting: {
    customerAddressSchema: () => getConfig('customer.addressSchema', undefined)
  }
};

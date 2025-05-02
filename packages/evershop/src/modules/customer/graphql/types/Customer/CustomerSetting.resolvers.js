import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Setting: {
    customerAddressSchema: () => getConfig('customer.addressSchema', undefined)
  }
};

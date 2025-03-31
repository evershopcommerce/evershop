import { getConfig } from '@evershop/evershop/src/lib/util/getConfig.js';

export default {
  Setting: {
    showShippingNote: () => getConfig('checkout.showShippingNote', true)
  }
};

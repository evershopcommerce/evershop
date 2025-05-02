import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Setting: {
    showShippingNote: () => getConfig('checkout.showShippingNote', true)
  }
};

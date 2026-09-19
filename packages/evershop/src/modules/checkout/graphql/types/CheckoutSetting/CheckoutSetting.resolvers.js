import { getConfig } from '../../../../../lib/util/getConfig.js';
import { getAllowGuestCheckout } from '../../../services/checkoutSettings.js';

export default {
  Setting: {
    showShippingNote: () => getConfig('checkout.showShippingNote', true),
    allowGuestCheckout: () => getAllowGuestCheckout()
  }
};

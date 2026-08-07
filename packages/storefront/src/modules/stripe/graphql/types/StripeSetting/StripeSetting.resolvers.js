import { getConfig } from '../../../../../lib/util/getConfig.js';

export default {
  Setting: {
    stripePaymentStatus: (setting) => {
      const stripeConfig = getConfig('system.stripe', {});
      if (stripeConfig.status) {
        return stripeConfig.status;
      }
      const stripePaymentStatus = setting.find(
        (s) => s.name === 'stripePaymentStatus'
      );
      if (stripePaymentStatus) {
        return parseInt(stripePaymentStatus.value, 10);
      } else {
        return 0;
      }
    },
    stripeDisplayName: (setting) => {
      const stripeDisplayName = setting.find(
        (s) => s.name === 'stripeDisplayName'
      );
      if (stripeDisplayName) {
        return stripeDisplayName.value;
      } else {
        return 'Credit Card';
      }
    },
    stripePublishableKey: (setting) => {
      const stripeConfig = getConfig('system.stripe', {});
      if (stripeConfig.publishableKey) {
        return stripeConfig.publishableKey;
      }
      const stripePublishableKey = setting.find(
        (s) => s.name === 'stripePublishableKey'
      );
      if (stripePublishableKey) {
        return stripePublishableKey.value;
      } else {
        return null;
      }
    },
    stripePaymentMode: (setting) => {
      const stripePaymentMode = setting.find(
        (s) => s.name === 'stripePaymentMode'
      );
      if (stripePaymentMode) {
        return stripePaymentMode.value;
      } else {
        return 'capture';
      }
    }
  }
};

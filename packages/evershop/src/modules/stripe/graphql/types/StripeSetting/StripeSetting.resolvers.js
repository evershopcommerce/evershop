const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports = {
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
    stripeDislayName: (setting) => {
      const stripeDislayName = setting.find(
        (s) => s.name === 'stripeDislayName'
      );
      if (stripeDislayName) {
        return stripeDislayName.value;
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
    }
  }
};

const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

module.exports = {
  Setting: {
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
    stripeSecretKey: (setting, _, { user }) => {
      const stripeConfig = getConfig('system.stripe', {});
      if (stripeConfig.secretKey) {
        return `${stripeConfig.secretKey.substr(
          0,
          5
        )}*******************************`;
      }
      if (user) {
        const stripeSecretKey = setting.find(
          (s) => s.name === 'stripeSecretKey'
        );
        if (stripeSecretKey) {
          return stripeSecretKey.value;
        } else {
          return null;
        }
      } else {
        return null;
      }
    },
    stripeEndpointSecret: (setting, _, { user }) => {
      const stripeConfig = getConfig('system.stripe', {});
      if (stripeConfig.endpointSecret) {
        return `${stripeConfig.endpointSecret.substr(
          0,
          5
        )}*******************************`;
      }
      if (user) {
        const stripeEndpointSecret = setting.find(
          (s) => s.name === 'stripeEndpointSecret'
        );
        if (stripeEndpointSecret) {
          return stripeEndpointSecret.value;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }
  }
};

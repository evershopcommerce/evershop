const { getConfig } = require("../../../../../lib/util/getConfig");

module.exports = {
  Setting: {
    stripePaymentStatus: (setting, { _ }, { pool }) => {
      const stripeConfig = getConfig('system.stripe', {});
      if (stripeConfig.status) {
        return stripeConfig.status;
      }
      const stripePaymentStatus = setting.find(s => s.name === 'stripePaymentStatus');
      if (stripePaymentStatus) {
        return parseInt(stripePaymentStatus.value);
      } else {
        return 0;
      }
    },
    stripeDislayName: (setting, { _ }, { pool }) => {
      const stripeDislayName = setting.find(s => s.name === 'stripeDislayName');
      if (stripeDislayName) {
        return stripeDislayName.value;
      } else {
        return 'Credit Card';
      }
    },
    stripePublishableKey: (setting, { _ }, { tokenPayload }) => {
      const stripeConfig = getConfig('system.stripe', {});
      if (stripeConfig.publishableKey) {
        return stripeConfig.publishableKey;
      }
      const stripePublishableKey = setting.find(s => s.name === 'stripePublishableKey');
      if (stripePublishableKey) {
        return stripePublishableKey.value;
      } else {
        return null;
      }
    },
    stripeSecretKey: (setting, { _ }, { tokenPayload }) => {
      const stripeConfig = getConfig('system.stripe', {});
      if (stripeConfig.secretKey) {
        return '*******************************';
      }
      if (tokenPayload && tokenPayload?.user?.isAdmin === true) {
        const stripeSecretKey = setting.find(s => s.name === 'stripeSecretKey');
        if (stripeSecretKey) {
          return stripeSecretKey.value;
        } else {
          return null;
        }
      } else {
        return null;
      }
    },
    stripeEndpointSecret: (setting, { _ }, { tokenPayload }) => {
      const stripeConfig = getConfig('system.stripe', {});
      if (stripeConfig.endpointSecret) {
        return '*******************************';
      }
      if (tokenPayload && tokenPayload?.user?.isAdmin === true) {
        const stripeEndpointSecret = setting.find(s => s.name === 'stripeEndpointSecret');
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
}